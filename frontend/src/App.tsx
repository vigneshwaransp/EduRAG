import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DocumentProvider, useDocuments } from './context/DocumentContext';
import { api } from './services/api';

import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavView } from './components/layout/Sidebar';
import { SourceDrawer } from './components/layout/SourceDrawer';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/common/AuthModal';

import { DashboardView } from './components/dashboard/DashboardView';
import { DocumentsView } from './components/documents/DocumentsView';
import { AITutorView } from './components/chat/AITutorView';
import { SummariesView } from './components/summaries/SummariesView';
import { QuizzesView } from './components/quizzes/QuizzesView';
import { FlashcardsView } from './components/flashcards/FlashcardsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { DocumentViewerView } from './components/viewer/DocumentViewerView';
import { EvaluationView } from './components/eval/EvaluationView';
import { SpotlightSearchModal } from './components/search/SpotlightSearchModal';

const AppContent: React.FC = () => {
  const { documents, setActiveDocument } = useDocuments();
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'waking' | 'offline'>('checking');

  useEffect(() => {
    let isMounted = true;
    let wakeTimer: any = null;

    const pingBackend = async (isInitial = false) => {
      if (isInitial) {
        // If initial health check takes longer than 2.5s, signal waking
        wakeTimer = setTimeout(() => {
          if (isMounted) setServerStatus('waking');
        }, 2500);
      }

      try {
        await api.getHealth();
        if (isMounted) {
          if (wakeTimer) clearTimeout(wakeTimer);
          setServerStatus('connected');
        }
      } catch {
        if (isMounted) {
          if (isInitial) {
            setServerStatus('waking');
            // Retry after 4 seconds during cold start
            setTimeout(() => pingBackend(true), 4000);
          } else {
            setServerStatus('offline');
          }
        }
      }
    };

    pingBackend(true);

    // Heartbeat ping every 4 minutes to keep Render backend warm while tab is open
    const heartbeatInterval = setInterval(() => {
      pingBackend(false);
    }, 4 * 60 * 1000);

    return () => {
      isMounted = false;
      if (wakeTimer) clearTimeout(wakeTimer);
      clearInterval(heartbeatInterval);
    };
  }, []);

  const handleJumpToViewer = (docId: string, pageNumber: number) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) setActiveDocument(doc);
    setCurrentView('viewer');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-black text-black dark:text-neutral-100 font-sans antialiased">
      {/* Cold Start Notice Banner */}
      {serverStatus === 'waking' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-200 px-4 py-2 text-xs font-mono flex items-center justify-between z-50">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Connecting to EduRAG Cloud Backend (Render free tier wakes up from idle sleep in ~30s)...</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 hidden md:inline">Connecting</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        serverStatus={serverStatus}
      />

      {/* 3-Column Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={(v) => setCurrentView(v)}
        />

        {/* Center Column: Dynamic Workspace */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-black relative">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={(v) => setCurrentView(v)}
              onOpenUpload={() => setCurrentView('documents')}
            />
          )}
          {currentView === 'documents' && (
            <DocumentsView
              onNavigate={(v) => setCurrentView(v)}
            />
          )}
          {currentView === 'tutor' && (
            <AITutorView
              onOpenViewer={handleJumpToViewer}
            />
          )}
          {currentView === 'summaries' && (
            <SummariesView />
          )}
          {currentView === 'quizzes' && (
            <QuizzesView
              onNavigate={(v) => setCurrentView(v)}
            />
          )}
          {currentView === 'flashcards' && (
            <FlashcardsView />
          )}
          {currentView === 'analytics' && (
            <AnalyticsView />
          )}
          {currentView === 'viewer' && (
            <DocumentViewerView />
          )}
          {currentView === 'eval' && (
            <EvaluationView />
          )}
        </main>

        {/* Right Column: Source Inspector Drawer */}
        <SourceDrawer
          onJumpToViewer={handleJumpToViewer}
        />
      </div>

      {/* Spotlight Semantic Search Modal (Ctrl+K) */}
      <SpotlightSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(v) => setCurrentView(v)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DocumentProvider>
          <AppContent />
        </DocumentProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
