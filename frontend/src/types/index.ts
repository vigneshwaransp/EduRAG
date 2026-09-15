export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  subject: string;
  status: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'ready' | 'failed';
  error_message?: string;
  page_count: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  chunk_index: number;
  page_number: number;
  section_title: string;
  text_content: string;
  token_count: number;
}

export interface DocumentPage {
  page_number: number;
  section_title: string;
  text: string;
}

export interface Citation {
  id?: string;
  document_id: string;
  document_title: string;
  page_number: number;
  chunk_text: string;
  relevance_score: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  latency_ms?: number;
  created_at: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  selected_document_ids: string[];
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  user_answer?: string;
  correct_answer?: string;
  is_correct?: boolean;
  explanation?: string;
  source_page: number;
  topic: string;
}

export interface QuizSession {
  id: string;
  title: string;
  difficulty: string;
  total_questions: number;
  score: number;
  percentage: number;
  completed: boolean;
  created_at: string;
  questions: QuizQuestion[];
  weak_topics: string[];
  grade?: string;
  grade_description?: string;
  incorrect_count?: number;
  unanswered_count?: number;
}

export interface Flashcard {
  id: string;
  document_id?: string;
  deck_name: string;
  front: string;
  back: string;
  source_page: number;
  topic: string;
  mastery_level: number; // 0: new, 1: learning, 2: mastered
  review_count: number;
  created_at: string;
}

export interface SummarySection {
  title: string;
  content: string;
  page_references: number[];
}

export interface SummaryResult {
  mode: string;
  title: string;
  document_titles: string[];
  summary_markdown: string;
  sections: SummarySection[];
  key_takeaways: string[];
  generated_at: string;
}

export interface ActivityDay {
  day: string;
  date: string;
  minutes: number;
  questions_count: number;
}

export interface SubjectMastery {
  subject: string;
  accuracy_percentage: number;
  documents_count: number;
  questions_answered: number;
  status: string;
}

export interface TopicPerformance {
  topic: string;
  subject: string;
  accuracy: number;
  is_weak: boolean;
}

export interface DashboardMetrics {
  total_documents: number;
  total_questions: number;
  study_sessions_count: number;
  quizzes_completed: number;
  total_study_minutes: number;
  overall_accuracy: number;
  weekly_activity: ActivityDay[];
  subject_mastery: SubjectMastery[];
  weak_areas: TopicPerformance[];
  strong_areas: TopicPerformance[];
  recent_activity: any[];
}

export interface SearchResultItem {
  chunk_id: string;
  document_id: string;
  document_title: string;
  page_number: number;
  section_title: string;
  snippet: string;
  score: number;
}
