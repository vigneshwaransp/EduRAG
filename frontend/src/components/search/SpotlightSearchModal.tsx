import React, { useState, useEffect } from 'react';
import { Search, X, FileText, Bookmark, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { SearchResultItem } from '../../types';
import { useDocuments } from '../../context/DocumentContext';
import { NavView } from '../layout/Sidebar';

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: NavView) => void;
}

export const SpotlightSearchModal: React.FC<SpotlightSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { setActiveCitation, setActiveDocument, documents } = useDocuments();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.search(val);
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    setActiveCitation({
      document_id: item.document_id,
      document_title: item.document_title,
      page_number: item.page_number,
      chunk_text: item.snippet,
      relevance_score: item.score
    });
    const targetDoc = documents.find(d => d.id === item.document_id);
    if (targetDoc) setActiveDocument(targetDoc);
    onClose();
    onNavigate('viewer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80">
      <div className="relative w-full max-w-2xl bg-black border border-white shadow-none overflow-hidden text-left font-sans">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800 bg-black">
          <Search className="w-4 h-4 text-white mr-3 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search vectorized passages (e.g. 'deadlock conditions', 'attention mechanism')..."
            className="w-full bg-transparent border-none text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
          />
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin mr-2" />}
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-2 bg-black">
          {results.map((item) => (
            <div
              key={item.chunk_id}
              onClick={() => handleSelectResult(item)}
              className="p-3.5 bg-black border border-zinc-800 hover:border-white hover:bg-zinc-950 transition-none cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                  <span className="font-sans font-bold text-white group-hover:underline">
                    {item.document_title}
                  </span>
                </div>
                <div className="flex items-center space-x-2 font-mono">
                  <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 border border-zinc-800 uppercase">
                    Folio {item.page_number}
                  </span>
                  <span className="text-[10px] font-bold text-white border border-zinc-700 px-2 py-0.5">
                    {Math.round(item.score * 100)}% MATCH
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-sans italic">
                "{item.snippet}"
              </p>
            </div>
          ))}

          {query && !loading && results.length === 0 && (
            <div className="p-8 text-center text-xs font-mono text-zinc-500 uppercase">
              No matching academic passages located across vector indices.
            </div>
          )}

          {!query && (
            <div className="p-8 text-center text-xs font-mono text-zinc-500 uppercase">
              Enter conceptual query or keyword to retrieve grounded treatise excerpts.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-zinc-950 border-t border-zinc-800 text-[10px] font-mono text-zinc-500 flex justify-between uppercase">
          <span>[ESC] TO DISMISS</span>
          <span>SEMANTIC EMBEDDING INDEX // CHROMADB</span>
        </div>
      </div>
    </div>
  );
};
