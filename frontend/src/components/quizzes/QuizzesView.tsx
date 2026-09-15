import React, { useState, useMemo } from 'react';
import {
  Award,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { api } from '../../services/api';
import { QuizSession, QuizQuestion } from '../../types';
import { NavView } from '../layout/Sidebar';

interface QuizzesViewProps {
  onNavigate: (view: NavView) => void;
}

// Academic grading scale
const calculateGrade = (pct: number): { grade: string; description: string } => {
  if (pct >= 90) return { grade: 'A+', description: 'Distinction — Comprehensive Theoretical Mastery' };
  if (pct >= 80) return { grade: 'A', description: 'Proficient — Strong Conceptual Grounding' };
  if (pct >= 70) return { grade: 'B', description: 'Competent — Satisfactory Core Recall' };
  if (pct >= 60) return { grade: 'C', description: 'Marginal — Revision of Weak Topics Recommended' };
  return { grade: 'F', description: 'Unsatisfactory — Critical Gaps in Material' };
};

// Robust answer comparator (normalizes letter choices and prefixes)
const isAnswerMatching = (userAns: string, correctAns?: string, options: string[] = []): boolean => {
  if (!userAns || !correctAns) return false;
  const u = userAns.trim().toLowerCase();
  const c = correctAns.trim().toLowerCase();
  if (u === c) return true;
  const clean = (s: string) => s.replace(/^[a-d0-9][\.\)\-\:\s]+\s*/i, '').trim();
  const uClean = clean(u);
  const cClean = clean(c);
  if (uClean && cClean && uClean === cClean) return true;
  if (c.length === 1 && 'abcd'.includes(c)) {
    const idx = c.charCodeAt(0) - 97;
    if (options[idx]) {
      const opt = options[idx].trim().toLowerCase();
      if (u === opt || uClean === clean(opt) || u === c) return true;
    }
  }
  return false;
};

export const QuizzesView: React.FC<QuizzesViewProps> = ({ onNavigate }) => {
  const { documents, setActiveDocument } = useDocuments();
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);

  // Active Quiz State
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: string }>({});
  const [submittedResults, setSubmittedResults] = useState<QuizSession | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  const handleGenerateQuiz = async () => {
    const docId = selectedDocId || documents[0]?.id;
    if (!docId) {
      alert('Please upload or select a document first.');
      return;
    }

    setLoading(true);
    setSubmittedResults(null);
    setSelectedAnswers({});
    setCurrentQIndex(0);

    try {
      const session = await api.generateQuiz({
        document_ids: [docId],
        difficulty,
        question_count: questionCount,
        question_types: ['MCQ']
      });
      setQuizSession(session);
    } catch (e: any) {
      alert(e.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId: string, option: string) => {
    if (submittedResults) return; // Prevent change after submit
    setSelectedAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const answeredCount = useMemo(() => {
    if (!quizSession) return 0;
    return quizSession.questions.filter(q => !!selectedAnswers[q.id]).length;
  }, [quizSession, selectedAnswers]);

  const unansweredCount = useMemo(() => {
    if (!quizSession) return 0;
    return quizSession.questions.length - answeredCount;
  }, [quizSession, answeredCount]);

  const handleSubmitClick = () => {
    if (!quizSession) return;
    if (unansweredCount > 0) {
      setShowSubmitModal(true);
    } else {
      executeSubmitQuiz();
    }
  };

  const executeSubmitQuiz = async () => {
    if (!quizSession) return;
    setShowSubmitModal(false);
    setLoading(true);

    const answersPayload = quizSession.questions.map(q => ({
      question_id: q.id,
      user_answer: selectedAnswers[q.id] || ''
    }));

    try {
      const evaluated = await api.submitQuiz(quizSession.id, answersPayload);
      const gradeInfo = evaluated.grade
        ? { grade: evaluated.grade, description: evaluated.grade_description || '' }
        : calculateGrade(evaluated.percentage);

      const enrichedSession: QuizSession = {
        ...evaluated,
        grade: evaluated.grade || gradeInfo.grade,
        grade_description: evaluated.grade_description || gradeInfo.description,
        incorrect_count: evaluated.incorrect_count ?? evaluated.questions.filter(q => q.user_answer && !q.is_correct).length,
        unanswered_count: evaluated.unanswered_count ?? evaluated.questions.filter(q => !q.user_answer).length
      };
      setSubmittedResults(enrichedSession);
    } catch (e: any) {
      console.warn('Backend submitQuiz returned an error, calculating score with local evaluation engine:', e);
      // Client-side fail-safe evaluation
      const evaluatedQuestions = quizSession.questions.map(q => {
        const userAns = selectedAnswers[q.id] || '';
        const isCorrect = isAnswerMatching(userAns, q.correct_answer, q.options);
        return {
          ...q,
          user_answer: userAns,
          is_correct: isCorrect
        };
      });

      const correctCount = evaluatedQuestions.filter(q => q.is_correct).length;
      const totalCount = Math.max(1, evaluatedQuestions.length);
      const percentage = Math.round((correctCount / totalCount) * 1000) / 10;
      const { grade, description } = calculateGrade(percentage);
      const incorrectCount = evaluatedQuestions.filter(q => q.user_answer && !q.is_correct).length;
      const unanswered = evaluatedQuestions.filter(q => !q.user_answer).length;
      const weakTopics = Array.from(new Set(evaluatedQuestions.filter(q => !q.is_correct && q.topic).map(q => q.topic)));

      const fallbackSession: QuizSession = {
        ...quizSession,
        score: correctCount,
        percentage,
        grade,
        grade_description: description,
        incorrect_count: incorrectCount,
        unanswered_count: unanswered,
        completed: true,
        questions: evaluatedQuestions,
        weak_topics: weakTopics
      };
      setSubmittedResults(fallbackSession);
    } finally {
      setLoading(false);
    }
  };

  // Topic mastery summary for results view
  const topicSummary = useMemo(() => {
    if (!submittedResults) return [];
    const map: { [topic: string]: { total: number; correct: number } } = {};
    submittedResults.questions.forEach(q => {
      const t = q.topic || 'General';
      if (!map[t]) map[t] = { total: 0, correct: 0 };
      map[t].total += 1;
      if (q.is_correct) map[t].correct += 1;
    });
    return Object.entries(map).map(([topic, stats]) => {
      const pct = Math.round((stats.correct / stats.total) * 100);
      let status = 'Needs Review';
      if (pct >= 80) status = 'Mastered';
      else if (pct >= 60) status = 'Competent';
      return {
        topic,
        total: stats.total,
        correct: stats.correct,
        pct,
        status
      };
    });
  }, [submittedResults]);

  const currentQ = quizSession?.questions[currentQIndex];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full text-left transition-colors">
      {/* Header */}
      <div className="pb-6 border-b-2 border-black dark:border-neutral-800">
        <h1 className="text-3xl md:text-4xl font-sans font-black tracking-tight text-black dark:text-white">
          Examination & Assessment Engine
        </h1>
        <p className="text-xs font-sans italic text-neutral-600 dark:text-neutral-400 mt-1">
          Generate rigorous diagnostic tests strictly derived from your uploaded educational records.
        </p>
      </div>

      {/* Quiz Setup Controls (if no active quiz) */}
      {!quizSession && (
        <div className="p-6 border border-black dark:border-neutral-800 bg-white dark:bg-black space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Target Doc */}
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-2">
                Study Material
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

            {/* Difficulty */}
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Easy', 'Medium', 'Hard'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2 text-xs font-mono font-bold uppercase tracking-wider transition border ${
                      difficulty === lvl
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                        : 'bg-white dark:bg-black border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-black dark:hover:border-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-2">
                Question Count
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`py-2 text-xs font-mono font-bold uppercase tracking-wider transition border ${
                      questionCount === cnt
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                        : 'bg-white dark:bg-black border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-black dark:hover:border-white'
                    }`}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateQuiz}
            disabled={loading || documents.length === 0}
            className="w-full sm:w-auto px-6 py-3 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition flex items-center justify-center space-x-2 disabled:opacity-40"
          >
            <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Synthesizing Grounded Questions...' : 'Generate Examination'}</span>
          </button>
        </div>
      )}

      {/* Unanswered Items Confirmation Modal */}
      {showSubmitModal && quizSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-6 max-w-md w-full space-y-5 shadow-2xl text-left">
            <div className="flex items-center space-x-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <AlertCircle className="w-5 h-5 text-black dark:text-white flex-shrink-0" />
              <h3 className="text-base font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                Unanswered Questions Warning
              </h3>
            </div>
            <p className="text-xs font-sans text-neutral-700 dark:text-neutral-300 leading-relaxed">
              You have <span className="font-bold text-black dark:text-white font-mono">{unansweredCount}</span> unanswered question{unansweredCount > 1 ? 's' : ''} out of <span className="font-bold text-black dark:text-white font-mono">{quizSession.questions.length}</span>. Any unanswered questions will receive 0 marks.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => {
                  const firstUnanswered = quizSession.questions.findIndex(q => !selectedAnswers[q.id]);
                  if (firstUnanswered !== -1) {
                    setCurrentQIndex(firstUnanswered);
                  }
                  setShowSubmitModal(false);
                }}
                className="px-4 py-2 border border-black dark:border-white bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900 text-black dark:text-white text-xs font-mono uppercase tracking-wider font-bold transition"
              >
                Review Unanswered
              </button>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  executeSubmitQuiz();
                }}
                className="px-4 py-2 border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-mono uppercase tracking-wider font-bold transition"
              >
                Submit Anyway
              </button>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white text-xs font-mono uppercase tracking-wider transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Quiz Player */}
      {quizSession && !submittedResults && currentQ && (
        <div className="space-y-4">
          {/* Top Persistent Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-black dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-left">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black dark:text-white">
                  Question {currentQIndex + 1} of {quizSession.questions.length}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 border border-black dark:border-white text-black dark:text-white">
                  {quizSession.difficulty}
                </span>
              </div>
              <p className="text-xs font-sans italic text-neutral-600 dark:text-neutral-400">
                Topic Focus: <span className="font-semibold not-italic text-black dark:text-white">{currentQ.topic || 'General Examination'}</span>
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Progress
                </div>
                <div className="text-xs font-mono font-bold text-black dark:text-white">
                  {answeredCount} / {quizSession.questions.length} Answered
                </div>
              </div>

              <button
                onClick={handleSubmitClick}
                disabled={loading}
                className="px-4 py-2 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition flex items-center space-x-2 disabled:opacity-40"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{loading ? 'Evaluating...' : 'Submit Examination'}</span>
              </button>
            </div>
          </div>

          {/* Question Navigator Palette */}
          <div className="p-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500">
                Question Navigator
              </span>
              <div className="flex items-center space-x-3 text-[9px] font-mono uppercase text-neutral-500">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-black dark:bg-white inline-block"></span>
                  <span>Active</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 border border-black dark:border-white bg-neutral-200 dark:bg-neutral-800 inline-block"></span>
                  <span>Answered</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 border border-neutral-300 dark:border-neutral-700 inline-block"></span>
                  <span>Pending</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {quizSession.questions.map((q, idx) => {
                const isCurrent = idx === currentQIndex;
                const isAnswered = !!selectedAnswers[q.id];
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQIndex(idx)}
                    className={`w-8 h-8 text-xs font-mono font-bold border transition flex items-center justify-center relative ${
                      isCurrent
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white ring-1 ring-black dark:ring-white'
                        : isAnswered
                        ? 'bg-neutral-100 dark:bg-neutral-900 border-black dark:border-white text-black dark:text-white font-semibold'
                        : 'bg-transparent border-neutral-300 dark:border-neutral-800 text-neutral-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                    }`}
                    title={`Question ${idx + 1} (${isAnswered ? 'Answered' : 'Unanswered'})`}
                  >
                    {idx + 1}
                    {isAnswered && !isCurrent && (
                      <span className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-black dark:bg-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Question Box */}
          <div className="p-6 md:p-8 border-2 border-black dark:border-neutral-800 bg-white dark:bg-black space-y-6 text-left">
            {/* Question Text */}
            <h2 className="text-lg md:text-xl font-sans font-bold text-black dark:text-white leading-relaxed">
              {currentQ.question_text}
            </h2>

            {/* Options */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt, idx) => {
                const selected = selectedAnswers[currentQ.id] === opt;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, opt)}
                    className={`w-full p-4 border text-left text-xs md:text-sm font-sans transition flex items-start space-x-3 ${
                      selected
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-semibold'
                        : 'bg-white dark:bg-black border-neutral-300 dark:border-neutral-800 text-black dark:text-neutral-200 hover:border-black dark:hover:border-white'
                    }`}
                  >
                    <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold border flex-shrink-0 mt-0.5 ${
                      selected ? 'border-white text-white dark:border-black dark:text-black' : 'border-neutral-400 text-neutral-600 dark:text-neutral-400'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Stepper Footer Controls */}
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentQIndex(i => Math.max(0, i - 1))}
                disabled={currentQIndex === 0}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white text-xs font-mono uppercase tracking-wider hover:border-black dark:hover:border-white disabled:opacity-30 transition flex items-center space-x-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-2">
                {currentQIndex < quizSession.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQIndex(i => i + 1)}
                    className="px-5 py-2 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono uppercase tracking-wider font-bold transition flex items-center space-x-1.5"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleSubmitClick}
                  disabled={loading}
                  className="px-6 py-2 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition flex items-center space-x-2 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Evaluating...' : 'Submit Examination'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submitted Results & Review Card */}
      {submittedResults && (
        <div className="space-y-6">
          {/* Score Header Card */}
          <div className="p-6 md:p-8 border-2 border-black dark:border-white bg-white dark:bg-black space-y-6 text-left">
            {/* Top Row: Title, Grade Badge, Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block">
                  Diagnostic Assessment Report
                </span>
                <h2 className="text-3xl md:text-4xl font-sans font-black text-black dark:text-white mt-1">
                  Final Score: {submittedResults.score} / {submittedResults.total_questions}
                </h2>
                <p className="text-xs font-sans italic text-neutral-600 dark:text-neutral-400 mt-0.5">
                  {submittedResults.title}
                </p>
              </div>

              {/* Academic Grade Badge */}
              <div className="flex items-center space-x-4">
                <div className="text-right border-r border-neutral-300 dark:border-neutral-800 pr-4">
                  <div className="text-4xl font-mono font-black text-black dark:text-white tracking-tight">
                    {submittedResults.grade || '—'}
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
                    Academic Grade
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      setQuizSession(null);
                      setSubmittedResults(null);
                    }}
                    className="flex items-center justify-center space-x-1.5 px-4 py-2 border border-black dark:border-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white text-xs font-mono uppercase tracking-wider font-bold transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>New Exam</span>
                  </button>
                  <button
                    onClick={() => onNavigate('tutor')}
                    className="flex items-center justify-center space-x-1.5 px-4 py-2 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono uppercase tracking-wider font-bold transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Review in Tutor</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grade Description & Performance Note */}
            {submittedResults.grade_description && (
              <div className="p-3 border border-black dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono">
                <span className="font-bold text-black dark:text-white uppercase tracking-wider">Evaluation Classification:</span>
                <span className="text-neutral-800 dark:text-neutral-200">{submittedResults.grade_description}</span>
              </div>
            )}

            {/* 4 Diagnostic Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 border border-black dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Total Tested</div>
                <div className="text-2xl font-mono font-black text-black dark:text-white mt-1">
                  {submittedResults.total_questions}
                </div>
                <div className="text-[10px] font-mono text-neutral-500 mt-0.5">100% Curriculum</div>
              </div>

              <div className="p-4 border border-black dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Correct (+1)</div>
                <div className="text-2xl font-mono font-black text-black dark:text-white mt-1">
                  {submittedResults.score}
                </div>
                <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                  +{submittedResults.score} Points
                </div>
              </div>

              <div className="p-4 border border-black dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Incorrect</div>
                <div className="text-2xl font-mono font-black text-black dark:text-white mt-1">
                  {submittedResults.incorrect_count ?? (submittedResults.total_questions - submittedResults.score)}
                </div>
                <div className="text-[10px] font-mono text-neutral-500 mt-0.5">Remediation Area</div>
              </div>

              <div className="p-4 border border-black dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Overall Accuracy</div>
                <div className="text-2xl font-mono font-black text-black dark:text-white mt-1">
                  {submittedResults.percentage}%
                </div>
                <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                  {submittedResults.percentage >= 70 ? 'Satisfactory' : 'Needs Practice'}
                </div>
              </div>
            </div>

            {/* Proportional Ratio Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono uppercase text-neutral-500">
                <span>Score Distribution</span>
                <span>{submittedResults.score} of {submittedResults.total_questions} items ({submittedResults.percentage}%)</span>
              </div>
              <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 border border-black dark:border-neutral-700 flex overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, Math.max(0, submittedResults.percentage))}%` }}
                  className="h-full bg-black dark:bg-white transition-all duration-500"
                  title={`Correct: ${submittedResults.score}`}
                />
              </div>
            </div>

            {/* Weak topics diagnosis */}
            {submittedResults.weak_topics.length > 0 && (
              <div className="p-4 border border-black dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-start space-x-3 text-xs font-mono text-neutral-700 dark:text-neutral-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-black dark:text-white mt-0.5" />
                <div className="space-y-1 text-left">
                  <span className="font-bold uppercase tracking-wider text-black dark:text-white block">
                    Curriculum Revision Advised:
                  </span>
                  <p className="text-xs font-sans text-neutral-800 dark:text-neutral-200">
                    The following topics produced incorrect responses: <span className="font-mono font-bold text-black dark:text-white">{submittedResults.weak_topics.join(', ')}</span>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Topic-by-Topic Mastery Breakdown */}
          {topicSummary.length > 0 && (
            <div className="p-6 border border-black dark:border-neutral-800 bg-white dark:bg-black space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-black dark:text-white" />
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black dark:text-white">
                    Topic-by-Topic Mastery Analysis
                  </h3>
                </div>
                <span className="text-[10px] font-mono uppercase text-neutral-500">
                  {topicSummary.length} Curriculum Units Tested
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-black dark:border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-500">
                      <th className="py-2.5 px-3">Subject / Topic</th>
                      <th className="py-2.5 px-3 text-center">Items</th>
                      <th className="py-2.5 px-3 text-center">Correct</th>
                      <th className="py-2.5 px-3 text-center">Accuracy</th>
                      <th className="py-2.5 px-3 text-right">Mastery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {topicSummary.map((t, i) => (
                      <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-950 transition">
                        <td className="py-3 px-3 font-sans font-semibold text-black dark:text-white">
                          {t.topic}
                        </td>
                        <td className="py-3 px-3 text-center text-neutral-700 dark:text-neutral-300">
                          {t.total}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-black dark:text-white">
                          {t.correct}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-black dark:text-white">{t.pct}%</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border ${
                              t.pct >= 80
                                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold'
                                : t.pct >= 60
                                ? 'border-neutral-400 text-neutral-800 dark:text-neutral-200'
                                : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Question Review List */}
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-black dark:border-neutral-800">
              <h3 className="text-lg font-sans font-bold text-black dark:text-white">Detailed Item Verification Log</h3>
              <span className="text-[10px] font-mono uppercase text-neutral-500">
                Grounded in Uploaded Academic Records
              </span>
            </div>

            {submittedResults.questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 border border-black dark:border-neutral-800 bg-white dark:bg-black text-left space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-black dark:text-white">ITEM {idx + 1}</span>
                    <span className="text-neutral-500 text-[10px]">({q.topic})</span>
                  </div>
                  {q.is_correct ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 border border-black dark:border-white uppercase tracking-wider text-black dark:text-white">
                      CORRECT (+1)
                    </span>
                  ) : !q.user_answer ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 border border-neutral-400 text-neutral-500 uppercase tracking-wider">
                      UNANSWERED (0)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black uppercase tracking-wider">
                      INCORRECT (0)
                    </span>
                  )}
                </div>

                <p className="text-sm font-sans font-semibold text-black dark:text-white">{q.question_text}</p>

                {/* Options preview with indicator */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isUserChoice = q.user_answer === opt;
                      const isCorrectChoice = isAnswerMatching(opt, q.correct_answer, q.options);
                      return (
                        <div
                          key={optIdx}
                          className={`p-2 border text-xs font-sans flex items-start space-x-2 ${
                            isCorrectChoice
                              ? 'border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 font-semibold text-black dark:text-white'
                              : isUserChoice && !q.is_correct
                              ? 'border-neutral-400 line-through text-neutral-500'
                              : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                          }`}
                        >
                          <span className="font-mono text-[10px] font-bold flex-shrink-0">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="text-xs font-mono space-y-1 bg-neutral-50 dark:bg-neutral-950 p-3 border border-neutral-200 dark:border-neutral-800">
                  <p className="text-neutral-700 dark:text-neutral-300">
                    <span className="text-neutral-500 font-bold uppercase tracking-wider">Submitted:</span> {q.user_answer || '(No answer selected)'}
                  </p>
                  <p className="text-black dark:text-white font-bold">
                    <span className="text-neutral-500 uppercase tracking-wider">Expected Solution:</span> {q.correct_answer || 'See explanation below'}
                  </p>
                </div>

                {/* Grounded Citation & Explanation */}
                <div className="text-xs font-sans italic text-neutral-600 dark:text-neutral-400 pt-1 flex items-start space-x-2">
                  <Bookmark className="w-3.5 h-3.5 text-black dark:text-white flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono not-italic font-bold text-black dark:text-white">[Page {q.source_page}]:</span>{' '}
                    <span>{q.explanation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
