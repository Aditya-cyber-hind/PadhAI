 
'use client';

import { useState } from 'react';
import SourcePanel, { UploadedFile } from './SourcePanel';
import FeatureTabs from './FeatureTabs';

interface Props {
  pastedText: string;
  setPastedText: (value: string) => void;
  files: UploadedFile[];
  setFiles: (value: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  notebookId: string;
  combinedSources: string;
  hasSources: boolean;
  sourceNames: string[];
  onUploadComplete?: () => void;
}

type MobileTab = 'sources' | 'chat';

export default function MobileTabs({
  pastedText,
  setPastedText,
  files,
  setFiles,
  notebookId,
  combinedSources,
  hasSources,
  sourceNames,
}: Props) {
  const [tab, setTab] = useState<MobileTab>('sources');

  return (
    <div className="h-full flex flex-col">
      {/* Top tab bar */}
      <div className="flex border-b border-stone-200 bg-white flex-shrink-0">
        <button
          onClick={() => setTab('sources')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
            tab === 'sources'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500'
          }`}
        >
          📚 Sources
          {files.length > 0 && (
            <span className="ml-1 text-xs bg-stone-200 rounded-full px-2 py-0.5">
              {files.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
            tab === 'chat'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500'
          }`}
        >
          💬 Chat
        </button>
      </div>

      {/* Full-screen panel */}
      <div className="flex-1 min-h-0 relative">
        {tab === 'sources' ? (
          <div className="absolute inset-0 overflow-hidden">
            <SourcePanel
              pastedText={pastedText}
              setPastedText={setPastedText}
              files={files}
              setFiles={setFiles}
              notebookId={notebookId}
            />
          </div>
        ) : (
          <div className="absolute inset-0 overflow-hidden">
            <FeatureTabs
              sources={combinedSources}
              notebookId={notebookId}
              hasSources={hasSources}
              sourceNames={sourceNames}
            />
          </div>
        )}
      </div>
    </div>
  );
}