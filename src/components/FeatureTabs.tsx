'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ChatPanel from './ChatPanel';
import CoderPanel from './CoderPanel';
import QuizPanel from './QuizPanel';
import FlashcardPanel from './FlashcardPanel';
import BrainMapPanel from './BrainMapPanel';
import ReportPanel from './ReportPanel';
import SlideshowPanel from './SlideshowPanel';
import NotebookExportButton from './NotebookExportButton';
import ErrorBoundary from './ErrorBoundary';
import { tabCrossFade } from '@/lib/motion';

export type FeatureTab =
  | 'chat'
  | 'coder'
  | 'quiz'
  | 'flashcards'
  | 'slideshow'
  | 'brainmap'
  | 'report';

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
  sourceNames: string[];
  notebookName: string;
  notebookType?: 'study' | 'coding';
  activeTab?: FeatureTab;
  onTabChange?: (tab: FeatureTab) => void;
  hideTabBar?: boolean;
  pendingChatMessage?: string | null;
  onPendingChatMessageConsumed?: () => void;
}

const STUDY_TABS: Array<{ id: FeatureTab; label: string }> = [
  { id: 'chat', label: '💬 Chat' },
  { id: 'quiz', label: '📝 Quiz' },
  { id: 'flashcards', label: '🃏 Flashcards' },
  { id: 'slideshow', label: '📊 Slideshow' },
  { id: 'brainmap', label: '🧠 Brain Map' },
  { id: 'report', label: '📄 Report' },
];

const CODING_TABS: Array<{ id: FeatureTab; label: string }> = [
  { id: 'coder', label: '⌨️ Coder' },
  { id: 'chat', label: '💬 Chat' },
  { id: 'flashcards', label: '🃏 Flashcards' },
  { id: 'brainmap', label: '🧠 Brain Map' },
];

const TAB_LABELS: Record<FeatureTab, string> = {
  chat: 'Chat',
  coder: 'Coder',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  slideshow: 'Slideshow',
  brainmap: 'Brain Map',
  report: 'Report',
};

export default function FeatureTabs({
  sources,
  notebookId,
  hasSources,
  sourceNames,
  notebookName,
  notebookType = 'study',
  activeTab: controlledTab,
  onTabChange,
  hideTabBar = false,
  pendingChatMessage,
  onPendingChatMessageConsumed,
}: Props) {
  const isCoding = notebookType === 'coding';
  const TABS = isCoding ? CODING_TABS : STUDY_TABS;

  const [internalTab, setInternalTab] = useState<FeatureTab>(
    isCoding ? 'coder' : 'chat'
  );
  const activeTab = controlledTab ?? internalTab;

  const setTab = (tab: FeatureTab) => {
    if (onTabChange) onTabChange(tab);
    else setInternalTab(tab);
  };

  // If a pending chat message arrives while we're not on Chat, switch to it
  useEffect(() => {
    if (pendingChatMessage && activeTab !== 'chat') {
      setTab('chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatMessage]);

  return (
    <div className="h-full w-full min-w-0 flex flex-col bg-stone-50">
      {!hideTabBar && (
        <div className="flex items-center border-b border-stone-200 bg-white flex-shrink-0 px-2 sm:px-3 py-1.5">
          <div className="flex flex-1 overflow-x-auto gap-0.5 sm:gap-1 hide-scrollbar">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`relative px-3 py-1.5 sm:px-4 sm:py-2 text-[13px] sm:text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-white'
                      : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="feature-tab-pill"
                      className="absolute inset-0 bg-accent-500 rounded-full shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="px-1 sm:px-2 flex-shrink-0">
            <NotebookExportButton
              notebookId={notebookId}
              notebookName={notebookName}
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 relative w-full min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabCrossFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 w-full min-w-0"
          >
            {activeTab === 'chat' && (
              <div className="absolute inset-0 w-full min-w-0">
                <ErrorBoundary label={TAB_LABELS.chat} key={`boundary-chat-${notebookId}`}>
                  <ChatPanel
                    key={`chat-${notebookId}`}
                    sources={sources}
                    notebookId={notebookId}
                    sourceNames={sourceNames}
                    pendingMessage={pendingChatMessage ?? null}
                    onPendingMessageConsumed={onPendingChatMessageConsumed}
                  />
                </ErrorBoundary>
              </div>
            )}
            {activeTab === 'coder' && (
              <div className="absolute inset-0 w-full min-w-0">
                <ErrorBoundary label={TAB_LABELS.coder} key={`boundary-coder-${notebookId}`}>
                  <CoderPanel
                    key={`coder-${notebookId}`}
                    notebookId={notebookId}
                    sourceNames={sourceNames}
                  />
                </ErrorBoundary>
              </div>
            )}
            {activeTab === 'quiz' && (
              <div className="absolute inset-0 w-full min-w-0 overflow-y-auto">
                <ErrorBoundary label={TAB_LABELS.quiz} key={`boundary-quiz-${notebookId}`}>
                  <QuizPanel
                    key={`quiz-${notebookId}`}
                    sources={sources}
                    notebookId={notebookId}
                    hasSources={hasSources}
                  />
                </ErrorBoundary>
              </div>
            )}
            {activeTab === 'flashcards' && (
              <div className="absolute inset-0 w-full min-w-0 overflow-y-auto">
                <ErrorBoundary
                  label={TAB_LABELS.flashcards}
                  key={`boundary-flashcards-${notebookId}`}
                >
                  <FlashcardPanel
                    key={`flashcards-${notebookId}`}
                    sources={sources}
                    notebookId={notebookId}
                    hasSources={hasSources}
                  />
                </ErrorBoundary>
              </div>
            )}
            {activeTab === 'slideshow' && (
              <div className="absolute inset-0 w-full min-w-0 overflow-y-auto">
                <ErrorBoundary
                  label={TAB_LABELS.slideshow}
                  key={`boundary-slideshow-${notebookId}`}
                >
                  <SlideshowPanel
                    key={`slideshow-${notebookId}`}
                    sources={sources}
                    notebookId={notebookId}
                    hasSources={hasSources}
                  />
                </ErrorBoundary>
              </div>
            )}
            {activeTab === 'brainmap' && (
              <div className="absolute inset-0 w-full min-w-0">
                <ErrorBoundary
                  label={TAB_LABELS.brainmap}
                  key={`boundary-brainmap-${notebookId}`}
                >
                  <BrainMapPanel
                    key={`brainmap-${notebookId}`}
                    sources={sources}
                    notebookId={notebookId}
                    hasSources={hasSources}
                  />
                </ErrorBoundary>
              </div>
            )}
            {activeTab === 'report' && (
              <div className="absolute inset-0 w-full min-w-0 overflow-y-auto">
                <ErrorBoundary
                  label={TAB_LABELS.report}
                  key={`boundary-report-${notebookId}`}
                >
                  <ReportPanel
                    key={`report-${notebookId}`}
                    sources={sources}
                    notebookId={notebookId}
                    hasSources={hasSources}
                  />
                </ErrorBoundary>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}