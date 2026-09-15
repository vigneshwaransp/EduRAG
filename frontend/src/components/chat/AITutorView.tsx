import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Sparkles,
  Bookmark,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Mic,
  MicOff,
  Layers,
  FileText,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { api } from '../../services/api';
import { ChatMessage, Citation } from '../../types';

interface AITutorViewProps {
  onOpenViewer?: (docId: string, pageNumber: number) => void;
}

export const AITutorView: React.FC<AITutorViewProps> = ({ onOpenViewer }) => {
  const {
    documents,
    selectedDocIds,
    setSelectedDocIds,
    toggleDocSelection,
    activeCitation,
    setActiveCitation,
    setInspectorOpen,
    inspectorOpen
  } = useDocuments();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamCitations, setStreamCitations] = useState<Citation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamStatus]);

  // Initial welcome message if conversation is empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "### Hello! I am EduRAG, your academic document tutor.\n\n" +
            "I provide **grounded explanations, proofs, and definitions** strictly drawn from your uploaded study materials with verifiable page citations.\n\n" +
            "**What would you like to explore today?** You can select one or more documents above or ask across your entire workspace.",
          created_at: new Date().toISOString(),
          citations: []
        }
      ]);
    }
  }, []);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isStreaming) return;

    setInputText('');
    const userMsgId = Date.now().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString()
    };

    const assistantMsgId = (Date.now() + 1).toString();
    let accumulatedText = '';
    let currentCitations: Citation[] = [];

    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      citations: [],
      isStreaming: true
    };

    setMessages(prev => [...prev, newUserMsg, initialAssistantMsg]);
    setIsStreaming(true);
    setStreamStatus('Searching your documents...');
    setStreamCitations([]);

    // Stream response from backend with automatic fallback
    api.streamMessage(
      {
        message: textToSend,
        selected_document_ids: selectedDocIds,
        conversation_id: conversationId
      },
      {
        onStatus: (status) => {
          setStreamStatus(status);
        },
        onCitations: (cits) => {
          currentCitations = cits;
          setStreamCitations(cits);
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, citations: cits }
                : m
            )
          );
        },
        onToken: (token) => {
          accumulatedText += token;
          setStreamStatus(null); // Clear status once tokens arrive
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: accumulatedText, citations: currentCitations }
                : m
            )
          );
        },
        onDone: (meta) => {
          setIsStreaming(false);
          setStreamStatus(null);
          if (meta.conversation_id) setConversationId(meta.conversation_id);
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    latency_ms: meta.latency_ms,
                    content: accumulatedText || m.content,
                    citations: currentCitations.length > 0 ? currentCitations : m.citations
                  }
                : m
            )
          );
        },
        onError: async (err) => {
          console.warn('Streaming interrupted or failed, falling back to direct API call:', err);
          try {
            setStreamStatus('Synthesizing grounded response...');
            const resp = await api.sendMessage({
              message: textToSend,
              selected_document_ids: selectedDocIds,
              conversation_id: conversationId
            });
            if (resp.conversation_id) setConversationId(resp.conversation_id);
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: resp.answer,
                      citations: resp.citations,
                      latency_ms: resp.latency_ms,
                      isStreaming: false
                    }
                  : m
              )
            );
          } catch (fallbackErr) {
            console.error('Direct fallback also failed:', fallbackErr);
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content:
                        "I encountered an error retrieving the response. Please verify that your documents are uploaded and try again.",
                      isStreaming: false
                    }
                  : m
              )
            );
          } finally {
            setIsStreaming(false);
            setStreamStatus(null);
          }
        }
      }
    );
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCitationClick = (citation: Citation) => {
    setActiveCitation(citation);
    setInspectorOpen(true);
  };

  // Simulated Voice Input
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    if (!isListening) {
      recognition.start();
      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + ' ' + transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      recognition.stop();
      setIsListening(false);
    }
  };

  // Suggested follow-up prompts
  const samplePrompts = [
    "What are the four necessary conditions for a deadlock?",
    "Explain backpropagation using the chain rule.",
    "Compare AVL tree rotations with standard BST.",
    "How does the TCP 3-way handshake work?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-black text-black dark:text-neutral-100 text-left overflow-hidden transition-colors">
      {/* Top Document Selector Bar */}
      <div className="px-6 py-3 border-b border-black dark:border-neutral-800 bg-white dark:bg-black flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Layers className="w-4 h-4 text-black dark:text-white" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black dark:text-white">Scope:</span>
        </div>

        {/* Document selector pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setSelectedDocIds([])}
            className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider whitespace-nowrap transition border ${
              selectedDocIds.length === 0
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border-neutral-300 dark:border-neutral-800'
            }`}
          >
            All Texts ({documents.length})
          </button>

          {documents.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            return (
              <button
                key={doc.id}
                onClick={() => toggleDocSelection(doc.id)}
                className={`px-3 py-1 text-xs font-mono whitespace-nowrap flex items-center space-x-1.5 transition border ${
                  isSelected
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                    : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border-neutral-300 dark:border-neutral-800'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[140px]">{doc.title}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center space-x-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-500 flex-shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-black dark:text-white" />
          <span>Strict Anti-Hallucination</span>
        </div>
      </div>

      {/* Center Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl p-5 border space-y-3 ${
                  isUser
                    ? 'border-zinc-700 bg-zinc-950 text-white'
                    : 'border-white bg-black text-white shadow-none'
                }`}
              >
                {/* Header (Role & Latency) */}
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider pb-2 border-b border-zinc-800 opacity-80">
                  <div className="flex items-center space-x-2">
                    {isUser ? (
                      <span className="font-bold">Inquirer</span>
                    ) : (
                      <div className="flex items-center space-x-1.5 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        <span>EduRAG Scholar Engine</span>
                      </div>
                    )}
                  </div>
                  {msg.latency_ms !== undefined && msg.latency_ms > 0 && (
                    <span className="flex items-center space-x-1 text-zinc-400">
                      <Clock className="w-3 h-3" />
                      <span>{msg.latency_ms}ms</span>
                    </span>
                  )}
                </div>

                {/* Message Body (Markdown rendered) */}
                {isUser ? (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans selection:bg-white selection:text-black text-zinc-100">
                    {msg.content}
                  </div>
                ) : (
                  <div className="text-sm font-sans selection:bg-white selection:text-black space-y-3 leading-relaxed">
                    {!msg.content && msg.isStreaming ? (
                      <div className="flex items-center space-x-2 py-3 text-xs font-mono text-zinc-400">
                        <div className="w-2 h-2 bg-white animate-ping" />
                        <span>Searching documents & synthesizing grounded response...</span>
                      </div>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="text-xl font-sans font-bold text-white border-b border-zinc-800 pb-2 mt-4 mb-2 tracking-tight" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-lg font-sans font-bold text-white mt-4 mb-2 tracking-tight" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-base font-sans font-bold text-white mt-3 mb-1.5 border-l-2 border-white pl-2.5" {...props} />
                          ),
                          h4: ({ node, ...props }) => (
                            <h4 className="text-sm font-sans font-bold text-zinc-200 mt-2.5 mb-1" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="font-sans leading-relaxed text-zinc-200 text-sm mb-3 last:mb-0" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-outside ml-5 space-y-1.5 text-zinc-200 text-sm font-sans mb-3" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-outside ml-5 space-y-1.5 text-zinc-200 text-sm font-sans mb-3" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed text-zinc-200" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-bold text-white" {...props} />
                          ),
                          em: ({ node, ...props }) => (
                            <em className="italic text-zinc-300 font-sans" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-2 border-white pl-4 py-1 italic font-sans text-zinc-400 my-3 bg-zinc-950/60" {...props} />
                          ),
                          code: ({ node, inline, className, children, ...props }: any) => {
                            if (inline) {
                              return (
                                <code className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 font-mono text-xs text-white" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <pre className="bg-zinc-950 border border-zinc-800 p-3 font-mono text-xs overflow-x-auto text-zinc-200 my-3 leading-relaxed">
                                <code {...props}>{children}</code>
                              </pre>
                            );
                          },
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-4 border border-zinc-800">
                              <table className="w-full text-xs font-sans text-left divide-y divide-zinc-800" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-zinc-950 font-mono text-[10px] uppercase tracking-wider text-zinc-400" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="py-2 px-3 font-semibold border-b border-zinc-800 text-white" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="py-2 px-3 border-b border-zinc-900 text-zinc-300 font-sans" {...props} />
                          ),
                          hr: ({ node, ...props }) => (
                            <hr className="border-zinc-800 my-4" {...props} />
                          )
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                )}

                {/* Citations Pill Bar */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-3 border-t border-neutral-300 dark:border-neutral-800 space-y-2">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500 flex items-center space-x-1">
                      <Bookmark className="w-3 h-3" />
                      <span>Source Citations (Inspect Passage)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => handleCitationClick(c)}
                          className="flex items-center space-x-1.5 px-2.5 py-1 border border-black dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-xs font-mono transition"
                        >
                          <FileText className="w-3 h-3" />
                          <span className="font-sans font-medium">{c.document_title}</span>
                          <span className="text-[10px] border-l border-current pl-1 font-mono font-bold">
                            p.{c.page_number}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assistant Message Action Toolbar */}
                {!isUser && (
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-900 flex items-center justify-between text-xs font-mono text-neutral-500">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 border border-transparent hover:border-black dark:hover:border-white text-black dark:text-white transition flex items-center space-x-1"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[10px] uppercase tracking-wider">{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        className="p-1 border border-transparent hover:border-black dark:hover:border-white text-black dark:text-white transition"
                        title="Helpful response"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1 border border-transparent hover:border-black dark:hover:border-white text-black dark:text-white transition"
                        title="Report inaccuracy"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">
                      Curriculum Verified
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Stream Status Indicator */}
        {streamStatus && (
          <div className="flex justify-start">
            <div className="px-4 py-2 border-2 border-black dark:border-white bg-white dark:bg-black text-xs font-mono font-bold text-black dark:text-white flex items-center space-x-2">
              <div className="w-2 h-2 bg-black dark:bg-white animate-ping" />
              <span>{streamStatus}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up Prompts */}
      {messages.length <= 2 && (
        <div className="px-4 md:px-8 py-2 overflow-x-auto flex items-center space-x-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 whitespace-nowrap">Suggested:</span>
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              className="px-3 py-1 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black hover:border-black dark:hover:border-white text-xs font-sans text-black dark:text-white whitespace-nowrap transition"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="p-4 md:p-6 border-t-2 border-black dark:border-neutral-800 bg-white dark:bg-black">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-4xl mx-auto flex items-center space-x-3 border-2 border-black dark:border-white bg-white dark:bg-black px-4 py-2"
        >
          <button
            type="button"
            onClick={toggleVoice}
            className={`p-2 border transition ${
              isListening
                ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black animate-pulse'
                : 'border-transparent text-neutral-500 hover:text-black dark:hover:text-white'
            }`}
            title={isListening ? 'Stop listening' : 'Voice question'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedDocIds.length > 0
                ? `Inquire about selected course material...`
                : `Inquire across full academic repository...`
            }
            className="flex-1 bg-transparent border-none text-sm font-sans text-black dark:text-white placeholder-neutral-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
            className="p-2 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
