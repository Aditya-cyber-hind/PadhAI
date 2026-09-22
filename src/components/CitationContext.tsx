'use client';

import { createContext, useCallback, useContext, useState } from 'react';

export interface OpenCitation {
  id: number;
  sourceName: string;
  content: string;
}

interface CitationContextValue {
  openCitation: OpenCitation | null;
  showCitation: (citation: OpenCitation) => void;
  closeCitation: () => void;

  // Scroll-to-source coordination
  pendingScrollTarget: string | null;
  requestScrollToSource: (sourceName: string) => void;
  consumeScrollTarget: () => void;
}

const CitationContext = createContext<CitationContextValue | null>(null);

export function CitationProvider({ children }: { children: React.ReactNode }) {
  const [openCitation, setOpenCitation] = useState<OpenCitation | null>(null);
  const [pendingScrollTarget, setPendingScrollTarget] = useState<string | null>(null);

  const showCitation = useCallback((citation: OpenCitation) => {
    setOpenCitation(citation);
  }, []);

  const closeCitation = useCallback(() => {
    setOpenCitation(null);
  }, []);

  const requestScrollToSource = useCallback((sourceName: string) => {
    // Close the drawer first, then queue the scroll target.
    // SourcePanel will pick this up on its next render.
    setOpenCitation(null);
    setPendingScrollTarget(sourceName);
  }, []);

  const consumeScrollTarget = useCallback(() => {
    setPendingScrollTarget(null);
  }, []);

  return (
    <CitationContext.Provider
      value={{
        openCitation,
        showCitation,
        closeCitation,
        pendingScrollTarget,
        requestScrollToSource,
        consumeScrollTarget,
      }}
    >
      {children}
    </CitationContext.Provider>
  );
}

export function useCitation() {
  const ctx = useContext(CitationContext);
  if (!ctx) {
    throw new Error('useCitation must be used inside <CitationProvider>');
  }
  return ctx;
}