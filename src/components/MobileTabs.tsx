'use client';

import { useState } from 'react';
import SourcePanel, { UploadedFile } from './SourcePanel';
import FeatureTabs, { type FeatureTab } from './FeatureTabs';
import NotebookExportButton from './NotebookExportButton';

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
  onUploadComplete?: () => void;
}

type MobileTab = 'sources' | FeatureTab;

const NAV_TABS: Array<{ id: MobileTab; short: string; full: string }> = [
  { id: 'sources', short: '📚', full: '📚 Sources' },
  { id: 'chat', short: '💬', full: '💬 Chat' },
  { id: 'quiz', short: '📝', full: '📝 Quiz' },
  { id: 'flashcards', short: '🃏', full: '🃏 Cards' },
  { id: 'slideshow', short: '📊', full: '📊 Slides' },
  { id: 'brainmap', short: '🧠', full: '🧠 Map' },
  { id: 'report', short: '📄', full: '📄 Report' },
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
}: Props) {
  const [tab, setTab] = useState<MobileTab>('sources');

  const isSourcesTab = tab === 'sources';
  const featureTab: FeatureTab = isSourcesTab ? 'chat' : (tab as FeatureTab);

  return (
    <div className="h-full flex flex-col w-full min-w-0">
      {/* Single top nav bar — 7 tabs, horizontally scrollable */}
      <div className="flex items-center border-b border-stone-200 bg-white flex-shrink-0 w-full">
        <div className="flex flex-1 overflow-x-auto">
          {NAV_TABS.map((navTab) => {
            const isActive = tab === navTab.id;
            return (
              <button
                key={navTab.id}
                onClick={() => setTab(navTab.id)}
                className={`px-3 py-2 text-[13px] font-medium border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-stone-900 text-stone-900'
                    : 'border-transparent text-stone-500'
                }`}
              >
                <span className="sm:hidden">{navTab.short}</span>
                <span className="hidden sm:inline">{navTab.full}</span>
                {navTab.id === 'sources' && files.length > 0 && (
                  <span className="ml-1 text-[10px] bg-stone-200 rounded-full px-1.5 py-0.5">
                    {files.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-2 flex-shrink-0">
          <NotebookExportButton
            notebookId={notebookId}
            notebookName={notebookName}
          />
        </div>
      </div>

      {/* Full-screen panel */}
      <div className="flex-1 min-h-0 relative w-full min-w-0">
        {isSourcesTab ? (
          <div className="absolute inset-0 w-full min-w-0 overflow-hidden">
            <SourcePanel
              pastedText={pastedText}
              setPastedText={setPastedText}
              files={files}
              setFiles={setFiles}
              notebookId={notebookId}
            />
          </div>
        ) : (
          <div className="absolute inset-0 w-full min-w-0 overflow-hidden">
            <FeatureTabs
              sources={combinedSources}
              notebookId={notebookId}
              hasSources={hasSources}
              sourceNames={sourceNames}
              notebookName={notebookName}
              activeTab={featureTab}
              onTabChange={(t) => setTab(t)}
              hideTabBar={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}