import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  Sparkles,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
  Layers,
  FileCode
} from 'lucide-react';
import { useDocuments } from '../../context/DocumentContext';
import { api } from '../../services/api';
import { DocumentItem } from '../../types';
import { NavView } from '../layout/Sidebar';

interface DocumentsViewProps {
  onNavigate: (view: NavView) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ onNavigate }) => {
  const { documents, refreshDocuments, setActiveDocument, isLoading } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    stage: string;
    percentage: number;
    docTitle?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjects = ['All', ...Array.from(new Set(documents.map(d => d.subject)))];

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress({
      stage: 'Uploading document...',
      percentage: 15,
      docTitle: file.name
    });

    try {
      const doc = await api.uploadDocument(file);
      setUploadProgress({
        stage: 'Extracting text and page boundaries...',
        percentage: 40,
        docTitle: file.name
      });

      // Poll status for ingestion pipeline
      let status = 'uploading';
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 800));
        try {
          const s = await api.getDocumentStatus(doc.id);
          status = s.status;
          setUploadProgress({
            stage: s.current_step,
            percentage: s.progress_percentage,
            docTitle: file.name
          });
          if (status === 'ready' || status === 'failed') break;
        } catch {
          break;
        }
      }

      await refreshDocuments();
      await new Promise(r => setTimeout(r, 600));
    } catch (e: any) {
      alert(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this document and its indexed vector embeddings?')) {
      await api.deleteDocument(id);
      await refreshDocuments();
    }
  };

  const handleChatWithDoc = (doc: DocumentItem) => {
    setActiveDocument(doc);
    onNavigate('tutor');
  };

  const handleViewDoc = (doc: DocumentItem) => {
    setActiveDocument(doc);
    onNavigate('viewer');
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || doc.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full text-left transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-2 border-black dark:border-neutral-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-sans font-black tracking-tight text-black dark:text-white">
            Curriculum Document Repository
          </h1>
          <p className="text-xs font-sans italic text-neutral-600 dark:text-neutral-400 mt-1">
            Ingest academic textbooks, inspect recursive chunking, and manage OCR-extracted vector indexes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-4 py-2.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
          />
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="p-8 border-2 border-dashed border-black dark:border-neutral-700 hover:border-black dark:hover:border-white bg-neutral-50 dark:bg-neutral-950 transition cursor-pointer text-center relative overflow-hidden group"
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-10 h-10 mx-auto border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black flex items-center justify-center transition">
            <UploadCloud className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <p className="text-sm font-sans font-bold text-black dark:text-white">
              Drop study documents here, or <span className="underline decoration-1 underline-offset-2">browse filesystem</span>
            </p>
            <p className="text-xs font-mono text-neutral-500 mt-1">
              Supports PDF (with Native OCR), DOCX, TXT, and Markdown (up to 50MB)
            </p>
          </div>
        </div>
      </div>

      {/* Live Pipeline Processing Tracker */}
      {uploadProgress && (
        <div className="p-5 border-2 border-black dark:border-white bg-white dark:bg-black space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 text-black dark:text-white animate-spin" />
              <span className="text-black dark:text-white uppercase tracking-wider">PIPELINE: {uploadProgress.docTitle}</span>
            </div>
            <span className="text-black dark:text-white">{uploadProgress.percentage}%</span>
          </div>

          <div className="w-full h-2 border border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
            <div
              className="h-full bg-black dark:bg-white transition-all duration-300"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>

          <p className="text-xs font-mono text-neutral-600 dark:text-neutral-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-black dark:text-white" />
            <span>{uploadProgress.stage}</span>
          </p>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Subject Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {subjects.map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition border ${
                selectedSubject === sub
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                  : 'bg-white dark:bg-black text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-800 hover:border-black dark:hover:border-white'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search index..."
            className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 pl-9 pr-3 py-2 text-xs font-mono text-black dark:text-white placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-white transition"
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-5 border border-black dark:border-neutral-800 bg-white dark:bg-black hover:border-black dark:hover:border-white transition flex flex-col justify-between group relative"
          >
            <div>
              {/* Top metadata */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 border border-black dark:border-neutral-700 text-black dark:text-white uppercase tracking-wider">
                  {doc.subject}
                </span>

                <div className="flex items-center space-x-1.5">
                  {doc.status === 'ready' ? (
                    <span className="flex items-center space-x-1 text-[10px] font-mono uppercase tracking-wider text-black dark:text-white border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready</span>
                    </span>
                  ) : doc.status === 'failed' ? (
                    <span className="flex items-center space-x-1 text-[10px] font-mono uppercase tracking-wider text-black dark:text-white border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5">
                      <AlertCircle className="w-3 h-3" />
                      <span>Failed</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-[10px] font-mono uppercase tracking-wider text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>{doc.status}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Title & file info */}
              <h3 className="font-sans font-bold text-base text-black dark:text-white group-hover:underline transition line-clamp-2 leading-snug">
                {doc.title}
              </h3>
              <p className="text-[10px] font-mono text-neutral-500 mt-1 truncate">
                {doc.filename}
              </p>

              {/* Stats: Pages, Chunks, Size */}
              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 block">Pages</span>
                  <span className="font-bold text-black dark:text-white">{doc.page_count}</span>
                </div>
                <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 block">Chunks</span>
                  <span className="font-bold text-black dark:text-white">{doc.chunk_count}</span>
                </div>
                <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 block">Size</span>
                  <span className="font-bold text-black dark:text-white">
                    {doc.file_size > 1024 * 1024
                      ? `${(doc.file_size / (1024 * 1024)).toFixed(1)}MB`
                      : `${Math.round(doc.file_size / 1024)}KB`}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
              <button
                onClick={() => handleChatWithDoc(doc)}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white text-xs font-mono uppercase tracking-wider font-bold transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask Tutor</span>
              </button>

              <button
                onClick={() => handleViewDoc(doc)}
                title="Open Document Viewer"
                className="p-2 border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white text-black dark:text-white transition"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={(e) => handleDelete(doc.id, e)}
                title="Delete document"
                className="p-2 border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-neutral-600 dark:text-neutral-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <div className="p-12 border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-center">
          <FileText className="w-10 h-10 mx-auto text-neutral-400 dark:text-neutral-600 mb-3" />
          <h3 className="text-base font-sans font-bold text-black dark:text-white">No documents found</h3>
          <p className="text-xs font-sans italic text-neutral-500 mt-1">
            Try adjusting your search criteria or upload a new academic record.
          </p>
        </div>
      )}
    </div>
  );
};
