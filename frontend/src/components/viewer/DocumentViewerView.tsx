import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Search,
  BookOpen,
  Bookmark,
  FileText
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { api } from '../../services/api';
import { DocumentPage } from '../../types';

export const DocumentViewerView: React.FC = () => {
  const { documents, activeDocument, setActiveDocument, activeCitation } = useDocuments();
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [loadingPages, setLoadingPages] = useState<boolean>(false);
  const [searchInDoc, setSearchInDoc] = useState<string>('');

  // Load pages when activeDocument changes
  useEffect(() => {
    if (activeDocument) {
      setLoadingPages(true);
      api.getDocumentPages(activeDocument.id)
        .then(res => {
          setPages(res.pages);
          if (activeCitation && (activeCitation.document_id === activeDocument.id || activeCitation.document_title === activeDocument.title)) {
            setCurrentPageNum(activeCitation.page_number);
          } else {
            setCurrentPageNum(1);
          }
        })
        .catch(err => {
          console.error('Error fetching pages:', err);
          setPages([]);
        })
        .finally(() => setLoadingPages(false));
    }
  }, [activeDocument]);

  // When activeCitation updates, auto-navigate
  useEffect(() => {
    if (activeCitation) {
      const matchDoc = documents.find(d => d.id === activeCitation.document_id || d.title === activeCitation.document_title);
      if (matchDoc && matchDoc.id !== activeDocument?.id) {
        setActiveDocument(matchDoc);
      }
      setCurrentPageNum(activeCitation.page_number);
    }
  }, [activeCitation]);

  const currentPage = pages.find(p => p.page_number === currentPageNum) || pages[0];

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 15, 70));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-black text-white text-left overflow-hidden font-sans">
      {/* Top Toolbar */}
      <div className="px-6 py-3 border-b border-zinc-800 bg-black flex flex-wrap items-center justify-between gap-4">
        {/* Document Selector */}
        <div className="flex items-center space-x-3">
          <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <select
            value={activeDocument?.id || ''}
            onChange={(e) => {
              const doc = documents.find(d => d.id === e.target.value);
              if (doc) setActiveDocument(doc);
            }}
            className="bg-black border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white font-mono uppercase"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id} className="bg-black text-white">
                {d.title} ({d.page_count} P.)
              </option>
            ))}
          </select>
        </div>

        {/* Page Stepper */}
        <div className="flex items-center space-x-2 bg-black px-3 py-1.5 border border-zinc-800 text-xs font-mono">
          <button
            onClick={() => setCurrentPageNum(p => Math.max(p - 1, 1))}
            disabled={currentPageNum <= 1}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-white uppercase tracking-wider">
            Page {currentPageNum} of {pages.length || 1}
          </span>
          <button
            onClick={() => setCurrentPageNum(p => Math.min(p + 1, pages.length))}
            disabled={currentPageNum >= pages.length}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Search Controls */}
        <div className="flex items-center space-x-3">
          {/* In-page search */}
          <div className="relative w-48 hidden md:block">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchInDoc}
              onChange={(e) => setSearchInDoc(e.target.value)}
              placeholder="Find in sheet..."
              className="w-full bg-black border border-zinc-800 pl-8 pr-2 py-1.5 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex items-center space-x-1 bg-black p-1 border border-zinc-800 text-xs font-mono">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:text-white text-zinc-400 transition-none"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-white font-bold">{zoomLevel}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:text-white text-zinc-400 transition-none"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Document Page Previewer */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center bg-zinc-950">
        {loadingPages ? (
          <div className="m-auto text-center space-y-3 font-mono">
            <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin mx-auto" />
            <p className="text-xs uppercase tracking-widest text-zinc-500">Decimating & Rendering Folios...</p>
          </div>
        ) : currentPage ? (
          <div
            className="w-full max-w-4xl bg-black border border-zinc-800 p-8 md:p-14 transition-none space-y-6 relative"
            style={{ fontSize: `${(zoomLevel / 100) * 1}rem` }}
          >
            {/* Page Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 text-xs text-zinc-500 font-mono uppercase tracking-wider">
              <span className="text-white font-bold">
                {currentPage.section_title || 'General Section'}
              </span>
              <span>
                Folio {currentPage.page_number} / {pages.length}
              </span>
            </div>

            {/* Citation Alert Banner if active on this page */}
            {activeCitation && activeCitation.page_number === currentPage.page_number && (
              <div className="p-4 bg-zinc-950 border border-white text-xs font-mono text-white flex items-start space-x-3">
                <Bookmark className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block mb-1">[ACTIVE GROUNDING ANCHOR]</span>
                  <span className="font-sans italic text-zinc-300">"{activeCitation.chunk_text.slice(0, 160)}..."</span>
                </div>
              </div>
            )}

            {/* Page Text Body */}
            <div className="leading-loose text-zinc-200 font-sans whitespace-pre-wrap selection:bg-white selection:text-black">
              {currentPage.text}
            </div>

            {/* Page Footer */}
            <div className="pt-6 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between font-mono uppercase tracking-widest">
              <span>DOCUMENT // {activeDocument?.filename}</span>
              <span>EDURAG DOCUMENT REPOSITORY</span>
            </div>
          </div>
        ) : (
          <div className="m-auto text-center text-zinc-600 space-y-3 font-sans">
            <BookOpen className="w-10 h-10 mx-auto text-zinc-700" />
            <p className="text-base font-bold text-zinc-400">No Document Selected</p>
            <p className="text-xs font-mono text-zinc-600 uppercase">Select an archived treatise from the toolbar</p>
          </div>
        )}
      </div>
    </div>
  );
};
