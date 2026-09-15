import React from 'react';
import {
  LayoutDashboard,
  Files,
  Sparkles,
  BookOpen,
  Award,
  Layers,
  BarChart3,
  FileText,
  Activity,
  ChevronRight
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';

export type NavView =
  | 'dashboard'
  | 'documents'
  | 'tutor'
  | 'summaries'
  | 'quizzes'
  | 'flashcards'
  | 'analytics'
  | 'viewer'
  | 'eval';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { documents } = useDocuments();

  const navItems: { id: NavView; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'documents',
      label: 'Documents Index',
      icon: <Files className="w-4 h-4" />,
      badge: documents.length > 0 ? documents.length : undefined,
    },
    {
      id: 'tutor',
      label: 'AI Grounded Tutor',
      icon: <Sparkles className="w-4 h-4" />,
      badge: 'RAG',
    },
    {
      id: 'summaries',
      label: 'Academic Summaries',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'quizzes',
      label: 'Examination Generator',
      icon: <Award className="w-4 h-4" />,
    },
    {
      id: 'flashcards',
      label: 'Memory Decks',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'analytics',
      label: 'Curriculum Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'viewer',
      label: 'Document Viewer',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'eval',
      label: 'Benchmark & Audit',
      icon: <Activity className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 border-r border-black dark:border-neutral-800 bg-white dark:bg-black flex flex-col justify-between p-4 select-none flex-shrink-0 transition-colors">
      <div>
        <div className="px-1 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3">
          Academic Workspace
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-sans transition-all group ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white font-semibold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent hover:border-neutral-300 dark:hover:border-neutral-800'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="transition">
                    {item.icon}
                  </span>
                  <span className="tracking-tight">{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge !== undefined && (
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 border ${
                        isActive
                          ? 'border-white text-white dark:border-black dark:text-black'
                          : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Workspace Status Card */}
      <div className="p-3 border border-black dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-black dark:bg-white"></div>
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-black dark:text-white">Grounding Active</span>
        </div>
        <p className="text-[11px] font-sans italic text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
          Retrieval verified across {documents.length} educational {documents.length === 1 ? 'record' : 'records'}.
        </p>
      </div>
    </aside>
  );
};
