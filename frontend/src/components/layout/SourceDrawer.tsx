import React from 'react';
import { X, FileText, ExternalLink, Bookmark, CheckCircle2 } from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';

interface SourceDrawerProps {
  onJumpToViewer?: (docId: string, pageNumber: number) => void;
}

export const SourceDrawer: React.FC<SourceDrawerProps> = ({ onJumpToViewer }) => {
  const { inspectorOpen, setInspectorOpen, activeCitation, activeDocument } = useDocuments();

  if (!inspectorOpen) return null;

  return (
    <aside className="w-80 lg:w-96 border-l border-black dark:border-neutral-800 bg-white dark:bg-black flex flex-col justify-between p-4 z-30 flex-shrink-0 transition-colors">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-4 h-4 text-black dark:text-white" />
            <h3 className="font-sans font-bold text-sm text-black dark:text-white tracking-tight">Source Inspector</h3>
          </div>
          <button
            onClick={() => setInspectorOpen(false)}
            className="p-1 border border-transparent hover:border-black dark:hover:border-white text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {activeCitation ? (
          <div className="mt-4 space-y-4">
            <div className="p-3.5 border border-black dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-black dark:text-white flex-shrink-0" />
                  <span className="text-xs font-sans font-bold text-black dark:text-white line-clamp-2">
                    {activeCitation.document_title}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black whitespace-nowrap">
                  PAGE {activeCitation.page_number}
                </span>
              </div>

              <div className="mt-2.5 flex items-center space-x-2 text-[10px] font-mono text-neutral-600 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800 pt-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-black dark:text-white" />
                <span>CONFIDENCE: {Math.round(activeCitation.relevance_score * 100)}% MATCH</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block mb-1.5">
                Retrieved Passage
              </label>
              <div className="p-3 border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed max-h-72 overflow-y-auto font-mono whitespace-pre-wrap selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
                {activeCitation.chunk_text}
              </div>
            </div>

            {onJumpToViewer && (
              <button
                onClick={() => onJumpToViewer(activeCitation.document_id, activeCitation.page_number)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono uppercase tracking-wider transition font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Document Viewer (Page {activeCitation.page_number})</span>
              </button>
            )}
          </div>
        ) : (
          <div className="mt-12 text-center text-neutral-500 px-4">
            <Bookmark className="w-8 h-8 mx-auto text-neutral-400 dark:text-neutral-700 mb-3 stroke-[1.5]" />
            <p className="text-xs font-sans font-bold text-black dark:text-white">No citation selected</p>
            <p className="text-[11px] font-sans italic text-neutral-500 mt-1">
              Select any citation badge in the AI Tutor responses to inspect the ground-truth passage.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 text-[10px] font-mono uppercase tracking-wider text-neutral-500 flex items-center justify-between">
        <span>EduRAG Verification</span>
        <span className="text-black dark:text-white font-bold">Grounded</span>
      </div>
    </aside>
  );
};
