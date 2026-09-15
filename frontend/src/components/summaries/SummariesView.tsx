import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Sparkles,
  Copy,
  Check,
  Download,
  Layers,
  FileText,
  Clock,
  Bookmark
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { api } from '../../services/api';
import { SummaryResult } from '../../types';

export const SummariesView: React.FC = () => {
  const { documents } = useDocuments();
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [summaryMode, setSummaryMode] = useState<string>('Exam Revision');
  const [topicFocus, setTopicFocus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const modes = [
    { id: 'Exam Revision', desc: 'Concepts, definitions, formulas & exam pitfalls' },
    { id: 'Quick Summary', desc: 'Concise 2-3 paragraph executive review' },
    { id: 'Detailed Summary', desc: 'Deep-dive comprehensive conceptual breakdown' },
    { id: 'Bullet Points', desc: 'High-yield bulleted review sheet' },
    { id: 'Key Concepts', desc: 'Core terminology & definitions glossary' },
  ];

  const handleGenerate = async () => {
    const docId = selectedDocId || (documents[0]?.id);
    if (!docId) {
      alert('Please select or upload at least one document.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.generateSummary({
        document_ids: [docId],
        mode: summaryMode,
        topic_focus: topicFocus || undefined
      });
      setSummary(res);
    } catch (e: any) {
      alert(e.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary.summary_markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto w-full text-left transition-colors">
      {/* Header */}
      <div className="pb-6 border-b-2 border-black dark:border-neutral-800">
        <h1 className="text-3xl md:text-4xl font-sans font-black tracking-tight text-black dark:text-white">
          Academic Synthesis & Revision Digest
        </h1>
        <p className="text-xs font-sans italic text-neutral-600 dark:text-neutral-400 mt-1">
          Distill high-yield exam revision sheets, definitions, and theorems directly grounded in your curriculum documents.
        </p>
      </div>

      {/* Control Panel */}
      <div className="p-6 border border-black dark:border-neutral-800 bg-white dark:bg-black space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document Picker */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-2">
              Target Course Text
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-3.5 py-2.5 text-xs font-sans text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.subject})
                </option>
              ))}
            </select>
          </div>

          {/* Optional Topic Focus */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-2">
              Optional Chapter / Focus Area
            </label>
            <input
              type="text"
              value={topicFocus}
              onChange={(e) => setTopicFocus(e.target.value)}
              placeholder="e.g. Concurrency & Deadlocks or Self-Attention"
              className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 px-3.5 py-2.5 text-xs font-sans text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>
        </div>

        {/* Mode Selector */}
        <div>
          <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-2">
            Synthesis Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {modes.map((m) => {
              const active = summaryMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSummaryMode(m.id)}
                  className={`p-3.5 border text-left transition ${
                    active
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                      : 'bg-white dark:bg-black border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-black dark:hover:border-white'
                  }`}
                >
                  <span className="font-sans font-bold text-xs block mb-1">{m.id}</span>
                  <span className="text-[11px] font-sans italic leading-tight opacity-75 block">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || documents.length === 0}
          className="w-full sm:w-auto px-6 py-3 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition flex items-center justify-center space-x-2 disabled:opacity-40"
        >
          <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Synthesizing Grounded Summary...' : `Generate ${summaryMode}`}</span>
        </button>
      </div>

      {/* Summary Output */}
      {summary && (
        <div className="p-6 md:p-8 border-2 border-black dark:border-neutral-800 bg-white dark:bg-black space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black">
                  {summary.mode}
                </span>
                <span className="text-[10px] font-mono text-neutral-500">{summary.generated_at}</span>
              </div>
              <h2 className="text-2xl font-sans font-bold text-black dark:text-white mt-2">{summary.title}</h2>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white text-black dark:text-white text-xs font-mono uppercase tracking-wider transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Rendered Summary Markdown with theme-adaptive monochrome typography */}
          <div className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-sans space-y-3 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-xl font-sans font-bold text-black dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-2 mt-4 mb-2 tracking-tight" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-lg font-sans font-bold text-black dark:text-white mt-4 mb-2 tracking-tight" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-base font-sans font-bold text-black dark:text-white mt-3 mb-1.5 border-l-2 border-black dark:border-white pl-2.5" {...props} />
                ),
                h4: ({ node, ...props }) => (
                  <h4 className="text-sm font-sans font-bold text-neutral-800 dark:text-neutral-200 mt-2.5 mb-1" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="font-sans leading-relaxed text-neutral-800 dark:text-neutral-200 text-sm mb-3 last:mb-0" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-outside ml-5 space-y-1.5 text-neutral-800 dark:text-neutral-200 text-sm font-sans mb-3" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-outside ml-5 space-y-1.5 text-neutral-800 dark:text-neutral-200 text-sm font-sans mb-3" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="leading-relaxed text-neutral-800 dark:text-neutral-200" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-black dark:text-white" {...props} />
                ),
                em: ({ node, ...props }) => (
                  <em className="italic text-neutral-700 dark:text-neutral-300 font-sans" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-2 border-black dark:border-white pl-4 py-2 italic font-sans text-neutral-700 dark:text-neutral-300 my-3 bg-neutral-100 dark:bg-neutral-900/60" {...props} />
                ),
                code: ({ node, inline, className, children, ...props }: any) => {
                  if (inline) {
                    return (
                      <code className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 px-1.5 py-0.5 font-mono text-xs text-black dark:text-white" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <pre className="bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 p-3 font-mono text-xs overflow-x-auto text-neutral-900 dark:text-neutral-200 my-3 leading-relaxed">
                      <code {...props}>{children}</code>
                    </pre>
                  );
                },
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4 border border-neutral-300 dark:border-neutral-800">
                    <table className="w-full text-xs font-sans text-left divide-y divide-neutral-200 dark:divide-neutral-800" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead className="bg-neutral-100 dark:bg-neutral-900 font-mono text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400" {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th className="py-2.5 px-3 font-semibold border-b border-neutral-300 dark:border-neutral-800 text-black dark:text-white" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="py-2.5 px-3 border-b border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 font-sans" {...props} />
                ),
                hr: ({ node, ...props }) => (
                  <hr className="border-neutral-200 dark:border-neutral-800 my-4" {...props} />
                )
              }}
            >
              {summary.summary_markdown}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};
