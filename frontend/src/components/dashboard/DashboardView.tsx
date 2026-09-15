import React, { useEffect, useState } from 'react';
import {
  FileText,
  MessageSquare,
  Award,
  Clock,
  ArrowUpRight,
  Sparkles,
  BookOpen,
  Plus,
  AlertCircle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useDocuments } from '../../context/DocumentContext';
import { api } from '../../services/api';
import { DashboardMetrics, DocumentItem } from '../../types';
import { NavView } from '../layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (view: NavView) => void;
  onOpenUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenUpload }) => {
  const { documents, setActiveDocument } = useDocuments();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(data => setMetrics(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenDocInTutor = (doc: DocumentItem) => {
    setActiveDocument(doc);
    onNavigate('tutor');
  };

  const handleOpenDocInViewer = (doc: DocumentItem) => {
    setActiveDocument(doc);
    onNavigate('viewer');
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full text-left transition-colors">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-2 border-black dark:border-neutral-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-sans font-black tracking-tight text-black dark:text-white">
            Academic Intelligence Overview
          </h1>
          <p className="text-xs font-sans italic text-neutral-600 dark:text-neutral-400 mt-1">
            Grounded curriculum telemetry, document indexing logs, and comprehension benchmarks.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-2 px-4 py-2.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={() => onNavigate('tutor')}
            className="flex items-center space-x-2 px-4 py-2.5 border border-black dark:border-neutral-700 bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white text-xs font-mono font-bold uppercase tracking-wider transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask AI Tutor</span>
          </button>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="p-5 border border-black dark:border-neutral-800 bg-white dark:bg-black group hover:bg-neutral-50 dark:hover:bg-neutral-950 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500">Total Documents</span>
            <FileText className="w-4 h-4 text-black dark:text-white" />
          </div>
          <div className="text-4xl font-sans font-black text-black dark:text-white">
            {metrics?.total_documents ?? documents.length}
          </div>
          <p className="text-[10px] font-mono text-neutral-500 mt-2 flex items-center space-x-1.5 uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-black dark:text-white" />
            <span>Indexed in Vector Store</span>
          </p>
        </div>

        <div className="p-5 border border-black dark:border-neutral-800 bg-white dark:bg-black group hover:bg-neutral-50 dark:hover:bg-neutral-950 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500">Questions Inquired</span>
            <MessageSquare className="w-4 h-4 text-black dark:text-white" />
          </div>
          <div className="text-4xl font-sans font-black text-black dark:text-white">
            {metrics?.total_questions ?? 38}
          </div>
          <p className="text-[10px] font-mono text-neutral-500 mt-2 flex items-center space-x-1.5 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-black dark:text-white" />
            <span>100% Grounded Citations</span>
          </p>
        </div>

        <div className="p-5 border border-black dark:border-neutral-800 bg-white dark:bg-black group hover:bg-neutral-50 dark:hover:bg-neutral-950 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500">Mastery Accuracy</span>
            <Award className="w-4 h-4 text-black dark:text-white" />
          </div>
          <div className="text-4xl font-sans font-black text-black dark:text-white">
            {metrics?.overall_accuracy ?? 88.5}%
          </div>
          <p className="text-[10px] font-mono text-neutral-500 mt-2 uppercase tracking-wider">
            {metrics?.quizzes_completed ?? 6} Quizzes Evaluated
          </p>
        </div>

        <div className="p-5 border border-black dark:border-neutral-800 bg-white dark:bg-black group hover:bg-neutral-50 dark:hover:bg-neutral-950 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500">Study Duration</span>
            <Clock className="w-4 h-4 text-black dark:text-white" />
          </div>
          <div className="text-4xl font-sans font-black text-black dark:text-white">
            {Math.round((metrics?.total_study_minutes ?? 390) / 60)}h {(metrics?.total_study_minutes ?? 390) % 60}m
          </div>
          <p className="text-[10px] font-mono text-neutral-500 mt-2 uppercase tracking-wider">Current Cycle</p>
        </div>
      </div>

      {/* Main Grid: Learning Activity Chart & Subject Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-8 p-6 border border-black dark:border-neutral-800 bg-white dark:bg-black space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h2 className="text-lg font-sans font-bold text-black dark:text-white">Curriculum Study Cadence</h2>
              <p className="text-xs font-sans italic text-neutral-600 dark:text-neutral-400">Minutes engaged per session over the past cycle</p>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-black dark:border-white text-black dark:text-white">
              7-Day Window
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.weekly_activity || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#737373" fontSize={11} tickLine={false} fontFamily="JetBrains Mono" />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} unit="m" fontFamily="JetBrains Mono" />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 border-2 border-black dark:border-white bg-white dark:bg-black text-xs font-mono">
                          <p className="font-bold text-black dark:text-white">{data.day} ({data.date})</p>
                          <p className="font-bold mt-1 text-black dark:text-white">{data.minutes} min studied</p>
                          <p className="text-neutral-500">{data.questions_count} queries dispatched</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="minutes">
                  {metrics?.weekly_activity?.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.minutes > 60 ? '#000000' : entry.minutes > 40 ? '#525252' : '#A3A3A3'}
                      stroke="#000000"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Mastery Radar / Breakdown */}
        <div className="lg:col-span-4 p-6 border border-black dark:border-neutral-800 bg-white dark:bg-black space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-lg font-sans font-bold text-black dark:text-white">Subject Mastery</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Diagnosis</span>
          </div>

          <div className="space-y-4 pt-2">
            {(metrics?.subject_mastery || []).map((sub, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-sans font-semibold text-black dark:text-white">{sub.subject}</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {sub.accuracy_percentage}%
                  </span>
                </div>
                <div className="w-full h-2 border border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full bg-black dark:bg-white transition-all duration-500"
                    style={{ width: `${sub.accuracy_percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Weak areas warning */}
          <div className="mt-4 p-3 border border-black dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-mono text-neutral-700 dark:text-neutral-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-black dark:text-white mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider text-black dark:text-white">Priority Focus:</span>{' '}
              <span>{metrics?.weak_areas?.[0]?.topic || 'TCP Congestion Control & Flow Control'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Learning Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-xl font-sans font-bold text-black dark:text-white">Continue Academic Study</h2>
            <p className="text-xs font-sans italic text-neutral-600 dark:text-neutral-400">Resume inspection of recently active course texts</p>
          </div>
          <button
            onClick={() => onNavigate('documents')}
            className="text-xs font-mono uppercase tracking-wider font-bold text-black dark:text-white hover:underline flex items-center space-x-1"
          >
            <span>Index Directory</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {documents.slice(0, 4).map((doc) => (
            <div
              key={doc.id}
              className="p-5 border border-black dark:border-neutral-800 bg-white dark:bg-black hover:border-black dark:hover:border-white transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 border border-black dark:border-neutral-700 text-black dark:text-white uppercase tracking-wider">
                    {doc.subject}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">{doc.page_count} Pages</span>
                </div>
                <h3 className="font-sans font-bold text-base text-black dark:text-white line-clamp-2">
                  {doc.title}
                </h3>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenDocInTutor(doc)}
                  className="flex-1 py-1.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono uppercase tracking-wider font-bold transition text-center"
                >
                  Ask Tutor
                </button>
                <button
                  onClick={() => handleOpenDocInViewer(doc)}
                  className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white text-black dark:text-white transition"
                  title="View Document"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <div className="col-span-4 p-8 border border-dashed border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-center">
              <FileText className="w-8 h-8 mx-auto text-black dark:text-white mb-2" />
              <h3 className="text-sm font-sans font-bold text-black dark:text-white">Workspace Empty</h3>
              <p className="text-xs font-sans italic text-neutral-500 mt-1 mb-4">
                Upload your first academic record to activate RAG tutoring and evaluations.
              </p>
              <button
                onClick={onOpenUpload}
                className="px-4 py-2 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black text-xs font-mono font-bold uppercase tracking-wider"
              >
                + Upload Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
