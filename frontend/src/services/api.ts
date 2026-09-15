import {
  User,
  DocumentItem,
  DocumentChunk,
  DocumentPage,
  Conversation,
  ChatMessage,
  Citation,
  QuizSession,
  Flashcard,
  SummaryResult,
  DashboardMetrics,
  SearchResultItem
} from '../types';

const env = (import.meta as any).env || {};
const API_BASE = env.VITE_API_BASE_URL
  ? `${(env.VITE_API_BASE_URL as string).replace(/\/+$/, '')}/api`
  : '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('edurag_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to sign in' }));
      throw new Error(err.detail || 'Failed to sign in');
    }
    const data = await res.json();
    localStorage.setItem('edurag_token', data.access_token);
    return data;
  },

  async register(email: string, password: string, full_name: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    localStorage.setItem('edurag_token', data.access_token);
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Unauthenticated');
    return res.json();
  },

  logout() {
    localStorage.removeItem('edurag_token');
  },

  // Documents
  async getDocuments(): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE}/documents`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
  },

  async getDocument(id: string): Promise<DocumentItem> {
    const res = await fetch(`${API_BASE}/documents/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load document');
    return res.json();
  },

  async getDocumentStatus(id: string): Promise<{
    id: string;
    status: string;
    error_message?: string;
    page_count: number;
    chunk_count: number;
    progress_percentage: number;
    current_step: string;
  }> {
    const res = await fetch(`${API_BASE}/documents/${id}/status`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load document status');
    return res.json();
  },

  async getDocumentChunks(id: string): Promise<DocumentChunk[]> {
    const res = await fetch(`${API_BASE}/documents/${id}/chunks`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load document chunks');
    return res.json();
  },

  async getDocumentPages(id: string): Promise<{
    document_id: string;
    title: string;
    total_pages: number;
    pages: DocumentPage[];
  }> {
    const res = await fetch(`${API_BASE}/documents/${id}/pages`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load document pages');
    return res.json();
  },

  async uploadDocument(file: File, title?: string, subject?: string): Promise<DocumentItem> {
    const token = localStorage.getItem('edurag_token');
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (subject) formData.append('subject', subject);

    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  async seedSamples(): Promise<void> {
    await fetch(`${API_BASE}/documents/seed-sample`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  // Chat & AI Tutor
  async sendMessage(params: {
    message: string;
    selected_document_ids?: string[];
    conversation_id?: string;
  }): Promise<{
    conversation_id: string;
    message_id: string;
    answer: string;
    citations: Citation[];
    latency_ms: number;
    grounded: boolean;
    documents_referenced: string[];
  }> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  streamMessage(
    params: {
      message: string;
      selected_document_ids?: string[];
      conversation_id?: string;
    },
    callbacks: {
      onStatus?: (status: string) => void;
      onCitations?: (citations: Citation[]) => void;
      onToken?: (token: string) => void;
      onDone?: (meta: { conversation_id: string; message_id: string; latency_ms: number }) => void;
      onError?: (err: any) => void;
    }
  ) {
    const token = localStorage.getItem('edurag_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No readable stream body');

        const decoder = new TextDecoder();
        let buffer = '';

        const processBuffer = () => {
          const parts = buffer.split(/\r?\n\r?\n/);
          buffer = parts.pop() || '';

          for (const line of parts) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const event = JSON.parse(trimmed.slice(6));
                if (event.type === 'status' && callbacks.onStatus) {
                  callbacks.onStatus(event.content);
                } else if (event.type === 'citations' && callbacks.onCitations) {
                  callbacks.onCitations(event.citations);
                } else if (event.type === 'token' && callbacks.onToken) {
                  callbacks.onToken(event.token);
                } else if (event.type === 'done' && callbacks.onDone) {
                  callbacks.onDone(event);
                }
              } catch (e) {
                console.error('Error parsing SSE event:', e);
              }
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) {
              processBuffer();
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          processBuffer();
        }
      })
      .catch((err) => {
        if (callbacks.onError) callbacks.onError(err);
      });
  },

  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/chat/conversations`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load conversations');
    return res.json();
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/chat/conversations/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load conversation');
    return res.json();
  },

  async deleteConversation(id: string): Promise<void> {
    await fetch(`${API_BASE}/chat/conversations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // Semantic Search
  async search(query: string, document_ids?: string[], top_k: number = 8): Promise<SearchResultItem[]> {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, document_ids, top_k }),
    });
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  // Summaries
  async generateSummary(params: {
    document_ids: string[];
    mode: string;
    topic_focus?: string;
  }): Promise<SummaryResult> {
    const res = await fetch(`${API_BASE}/summaries`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Summary generation failed' }));
      throw new Error(err.detail || 'Summary generation failed');
    }
    return res.json();
  },

  // Quizzes
  async generateQuiz(params: {
    document_ids: string[];
    difficulty: string;
    question_count: number;
    question_types: string[];
    topic_focus?: string;
  }): Promise<QuizSession> {
    const res = await fetch(`${API_BASE}/quizzes/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Quiz generation failed' }));
      throw new Error(err.detail || 'Quiz generation failed');
    }
    return res.json();
  },

  async submitQuiz(quiz_id: string, answers: { question_id: string; user_answer: string }[]): Promise<QuizSession> {
    const res = await fetch(`${API_BASE}/quizzes/${quiz_id}/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit quiz' }));
      throw new Error(err.detail || 'Failed to submit quiz');
    }
    return res.json();
  },

  async getQuizzes(): Promise<QuizSession[]> {
    const res = await fetch(`${API_BASE}/quizzes`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch quizzes');
    return res.json();
  },

  async getQuiz(id: string): Promise<QuizSession> {
    const res = await fetch(`${API_BASE}/quizzes/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch quiz');
    return res.json();
  },

  // Flashcards
  async generateFlashcards(params: {
    document_ids: string[];
    card_count: number;
    topic_focus?: string;
  }): Promise<Flashcard[]> {
    const res = await fetch(`${API_BASE}/flashcards/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Flashcard generation failed');
    return res.json();
  },

  async getFlashcards(deck_name?: string): Promise<Flashcard[]> {
    const url = deck_name ? `${API_BASE}/flashcards?deck_name=${encodeURIComponent(deck_name)}` : `${API_BASE}/flashcards`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch flashcards');
    return res.json();
  },

  async reviewFlashcard(card_id: string, mastery_level: number): Promise<Flashcard> {
    const res = await fetch(`${API_BASE}/flashcards/${card_id}/review`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ mastery_level }),
    });
    if (!res.ok) throw new Error('Failed to review flashcard');
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/analytics`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
  },

  // Evaluation
  async getBenchmark(): Promise<any> {
    const res = await fetch(`${API_BASE}/eval/benchmark`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to execute RAG evaluation');
    return res.json();
  },

  // Health
  async getHealth(): Promise<{ status: string; app_name: string; llm_provider: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
};
