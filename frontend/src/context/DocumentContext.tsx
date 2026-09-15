import React, { createContext, useContext, useState, useEffect } from 'react';
import { DocumentItem, Citation } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface DocumentContextType {
  documents: DocumentItem[];
  isLoading: boolean;
  selectedDocIds: string[];
  activeDocument: DocumentItem | null;
  activeCitation: Citation | null;
  inspectorOpen: boolean;
  setSelectedDocIds: (ids: string[]) => void;
  toggleDocSelection: (id: string) => void;
  setActiveDocument: (doc: DocumentItem | null) => void;
  setActiveCitation: (cit: Citation | null) => void;
  setInspectorOpen: (open: boolean) => void;
  refreshDocuments: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentItem | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);

  const refreshDocuments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !activeDocument) {
        setActiveDocument(docs[0]);
      }
    } catch (e) {
      console.error('Error loading documents:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshDocuments();
    } else {
      setDocuments([]);
      setActiveDocument(null);
    }
  }, [user]);

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSetCitation = (cit: Citation | null) => {
    setActiveCitation(cit);
    if (cit) {
      setInspectorOpen(true);
      // Also match document if found
      const matchedDoc = documents.find(d => d.id === cit.document_id || d.title === cit.document_title);
      if (matchedDoc) {
        setActiveDocument(matchedDoc);
      }
    }
  };

  return (
    <DocumentContext.Provider
      value={{
        documents,
        isLoading,
        selectedDocIds,
        activeDocument,
        activeCitation,
        inspectorOpen,
        setSelectedDocIds,
        toggleDocSelection,
        setActiveDocument,
        setActiveCitation: handleSetCitation,
        setInspectorOpen,
        refreshDocuments,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) throw new Error('useDocuments must be used within a DocumentProvider');
  return context;
};
