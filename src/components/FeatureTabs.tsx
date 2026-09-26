'use client';

import { useState } from 'react';
import ChatPanel from './ChatPanel';
import QuizPanel from './QuizPanel';
import FlashcardPanel from './FlashcardPanel';
import BrainMapPanel from './BrainMapPanel';
import ReportPanel from './ReportPanel';
import SlideshowPanel from './SlideshowPanel';
import NotebookExportButton from './NotebookExportButton';

export type FeatureTab = 'chat' | 'quiz' | 'flashcards' | 'slideshow' | 'brainmap' | 'report';

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
  sourceNames: string[];
  notebookName: string;
  // If provided, FeatureTabs is controlled by the parent (MobileTabs)
  activeTab?: FeatureTab;
  onTabChange?: (tab: FeatureTab) => void;
  // If true, hide the tab bar entirely (mobile uses MobileTabs's nav instead)
  hideTabBar?: boolean;
}

const TABS: Array<{ id: FeatureTab; label: string }> = [
  { id: 'chat', label: '💬 Chat' },
  { id: 'quiz', label: '📝 Quiz' },
  { id: 'flashcards', label: '🃏 Flashcards' },
  { id: 'slideshow', label: '📊 Slideshow' },
  { id: 'brainmap', label: '🧠 Brain Map' },
  { id: 'report', label: '📄 Report' },
];

export default function FeatureTabs({
  sources,
  notebookId,
  hasSources,
  sourceNames,
  notebookName,
  activeTab: controlledTab,
  onTabChange,
  hideTabBar = false,
}: Props) {
  const [internalTab, setInternalTab] = useState<FeatureTab>('chat');
  const activeTab = controlledTab ?? internalTab;

  const setTab = (tab: FeatureTab) => {
    if (onTabChange) onTabChange(tab);
    else setInternalTab(tab);
  };

  return (
    <div className="h-full w-full min-w-0 flex flex-col bg-stone-50">
      {!hideTabBar && (
        <div className="flex items-center border-b border-stone-200 bg-white flex-shrink-0">
          <div className="flex flex-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-3 py-2 sm:px-4 sm:py-3 text-[13px] sm:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-stone-900 text-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-3 flex-shrink-0">
            <NotebookExportButton
              notebookId={notebookId}
              notebookName={notebookName}
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 relative w-full min-w-0">
        {activeTab === 'chat' && (
          <div className="absolute inset-0 w-full min-w-0">
            <ChatPanel
              key={`chat-${notebookId}`}
              sources={sources}
              notebookId={notebookId}
              sourceNames={sourceNames}
            />
          </div>
        )}
        {activeTab === 'quiz' && (
          <div className="absolute inset-0 w-full min-w-0 overflow-y-auto">
            <QuizPanel
              key={`quiz-${notebookId}`}
              sources={sources}
              notebookId={notebookId}
              hasSources={hasSources}
            />
          </div>
        )}
        {activeTab === 'flashcards' && (
          <div className="absolute inset-0 w-full min-w-0 overflow-y-auto">
            <FlashcardPanel
              key={`flashcards-${notebookId}`}
              sources={sources}
              notebookId={notebookId}
              hasSources={hasSources}
            />
          </div>
        )}
        {activeTab === 'slideshow' && (
          <div className="absolute inset-0 w-full min-w-0 overflow-y-auto">
            <SlideshowPanel
              key={`slideshow-${notebookId}`}
              sources={sources}
              notebookId={notebookId}
              hasSources={hasSources}
            />
          </div>
        )}
        {activeTab === 'brainmap' && (
          <div className="absolute inset-0 w-full min-w-0">
            <BrainMapPanel
              key={`brainmap-${notebookId}`}
              sources={sources}
              notebookId={notebookId}
              hasSources={hasSources}
            />
          </div>
        )}
        {activeTab === 'report' && (
          <div className="absolute inset-0 w-full min-w-0 overflow-y-auto">
            <ReportPanel
              key={`report-${notebookId}`}
              sources={sources}
              notebookId={notebookId}
              hasSources={hasSources}
            />
          </div>
        )}
      </div>
    </div>
  );
}