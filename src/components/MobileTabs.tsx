'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import SourcePanel, { UploadedFile } from './SourcePanel';
import FeatureTabs, { type FeatureTab } from './FeatureTabs';
import NotebookExportButton from './NotebookExportButton';
import ErrorBoundary from './ErrorBoundary';

interface Props {
  pastedText: string;
  setPastedText: (value: string) => void;
  files: UploadedFile[];
  setFiles: (value: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  notebookId: string;
  combinedSources: string;
  hasSources: boolean;
  sourceNames: string[];
  notebookName: string;
  notebookType?: 'study' | 'coding';
  onUploadComplete?: () => void;
  pendingChatMessage?: string | null;
  onPendingChatMessageConsumed?: () => void;
}

type MobileTab = 'sources' | FeatureTab;

const STUDY_NAV: Array<{ id: MobileTab; short: string; full: string }> = [
  { id: 'sources', short: '📚', full: '📚 Sources' },
  { id: 'chat', short: '💬', full: '💬 Chat' },
  { id: 'quiz', short: '📝', full: '📝 Quiz' },
  { id: 'flashcards', short: '🃏', full: '🃏 Cards' },
  { id: 'slideshow', short: '📊', full: '📊 Slides' },
  { id: 'brainmap', short: '🧠', full: '🧠 Map' },
  { id: 'report', short: '📄', full: '📄 Report' },
];

const CODING_NAV: Array<{ id: MobileTab; short: string; full: string }> = [
  { id: 'sources', short: '📚', full: '📚 Sources' },
  { id: 'coder', short: '⌨️', full: '⌨️ Coder' },
  { id: 'chat', short: '💬', full: '💬 Chat' },
  { id: 'flashcards', short: '🃏', full: '🃏 Cards' },
  { id: 'brainmap', short: '🧠', full: '🧠 Map' },
];

export default function MobileTabs({
  pastedText,
  setPastedText,
  files,
  setFiles,
  notebookId,
  combinedSources,
  hasSources,
  sourceNames,
  notebookName,
  notebookType = 'study',
  pendingChatMessage,
  onPendingChatMessageConsumed,
}: Props) {
  const isCoding = notebookType === 'coding';
  const NAV_TABS = isCoding ? CODING_NAV : STUDY_NAV;

  const [tab, setTab] = useState<MobileTab>('sources');

  const isSourcesTab = tab === 'sources';
  const featureTab: FeatureTab = isSourcesTab
    ? isCoding
      ? 'coder'
      : 'chat'
    : (tab as FeatureTab);

  // Auto-switch to Chat tab when a pending message arrives
  useEffect(() => {
    if (pendingChatMessage && tab !== 'chat') {
      setTab('chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatMessage]);

  return (
    <div className="h-full flex flex-col w-full min-w-0">
      <div className="flex items-center border-b border-stone-200 bg-white flex-shrink-0 w-full px-2 py-1.5">
        <div className="flex flex-1 overflow-x-auto gap-0.5 hide-scrollbar">
          {NAV_TABS.map((navTab) => {
            const isActive = tab === navTab.id;
            return (
              <button
                key={navTab.id}
                onClick={() => setTab(navTab.id)}
                className={`relative px-3 py-1.5 text-[13px] font-medium rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${
                  isActive
                    ? 'text-white'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-pill"
                    className="absolute inset-0 bg-accent-500 rounded-full shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{navTab.short}</span>
                {navTab.id === 'sources' && files.length > 0 && (
                  <span
                    className={`relative z-10 text-[10px] rounded-full px-1.5 py-0.5 ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-accent-100 text-accent-800'
                    }`}
                  >
                    {files.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-1 flex-shrink-0">
          <NotebookExportButton
            notebookId={notebookId}
            notebookName={notebookName}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 relative w-full min-w-0">
        {isSourcesTab ? (
          <div className="absolute inset-0 w-full min-w-0 overflow-hidden">
            <ErrorBoundary label="Sources" key={`boundary-sources-${notebookId}`}>
              <SourcePanel
                pastedText={pastedText}
                setPastedText={setPastedText}
                files={files}
                setFiles={setFiles}
                notebookId={notebookId}
              />
            </ErrorBoundary>
          </div>
        ) : (
          <div className="absolute inset-0 w-full min-w-0 overflow-hidden">
            <ErrorBoundary label="Workspace" key={`boundary-workspace-${notebookId}`}>
              <FeatureTabs
                sources={combinedSources}
                notebookId={notebookId}
                hasSources={hasSources}
                sourceNames={sourceNames}
                notebookName={notebookName}
                notebookType={notebookType}
                activeTab={featureTab}
                onTabChange={(t) => setTab(t)}
                hideTabBar={true}
                pendingChatMessage={pendingChatMessage}
                onPendingChatMessageConsumed={onPendingChatMessageConsumed}
              />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}