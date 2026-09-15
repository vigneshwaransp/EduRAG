import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DocumentProvider, useDocuments } from './context/DocumentContext';

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

  const handleJumpToViewer = (docId: string, pageNumber: number) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) setActiveDocument(doc);
    setCurrentView('viewer');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-black text-black dark:text-neutral-100 font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
