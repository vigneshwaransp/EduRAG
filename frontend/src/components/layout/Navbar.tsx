import React from 'react';
import {
  Search,
  BookOpen,
  Sparkles,
  Sun,
  Moon,
  PanelRight,
  Database,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDocuments } from '../../context/DocumentContext';
import { api } from '../../services/api';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch, onOpenAuthModal }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { inspectorOpen, setInspectorOpen, refreshDocuments } = useDocuments();
  const [seeding, setSeeding] = React.useState(false);

  const handleSeedSamples = async () => {
    setSeeding(true);
    try {
      await api.seedSamples();
      await refreshDocuments();
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="h-16 border-b border-black dark:border-neutral-800 bg-white dark:bg-black sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between transition-colors">
      {/* Brand */}
      <div className="flex items-center space-x-3.5">
        <div className="w-9 h-9 border-2 border-black dark:border-white bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
          <BookOpen className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-sans font-black text-xl tracking-tight text-black dark:text-white">
              EduRAG
            </span>
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase px-1.5 py-0.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black">
              INTELLIGENCE
            </span>
          </div>
          <p className="text-[11px] font-sans italic text-neutral-600 dark:text-neutral-400 hidden sm:block">Academic Document Intelligence</p>
        </div>
      </div>

      {/* Center Search Spotlight Trigger */}
      {isAuthenticated && (
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 text-xs font-mono hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5" />
              <span>Search academic documents...</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 border border-neutral-400 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white">
              Ctrl+K
            </kbd>
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {isAuthenticated && (
          <button
            onClick={handleSeedSamples}
            disabled={seeding}
            title="Load or refresh sample educational textbooks"
            className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 border border-black dark:border-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white text-xs font-mono transition uppercase tracking-wider"
          >
            <Database className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Indexing...' : 'Sample Textbooks'}</span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 border border-neutral-300 dark:border-neutral-800 hover:border-black dark:hover:border-white text-neutral-800 dark:text-neutral-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Source Inspector Toggle */}
        {isAuthenticated && (
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            title="Toggle Source & Citation Inspector"
            className={`p-2 border transition ${
              inspectorOpen
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                : 'border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:border-black dark:hover:border-white'
            }`}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        )}

        {/* User Auth state */}
        {user && (
          <div className="flex items-center space-x-2 pl-2 border-l border-neutral-300 dark:border-neutral-800">
            <div className="w-8 h-8 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-xs font-mono font-bold">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden xl:block text-left text-xs font-mono">
              <p className="font-bold text-black dark:text-white leading-tight truncate max-w-[130px]">{user.full_name}</p>
              <p className="text-neutral-500 text-[10px] truncate max-w-[130px]">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
