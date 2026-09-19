'use client';

import { useState } from 'react';
import ChatPanel from './ChatPanel';
import QuizPanel from './QuizPanel';
import BrainMapPanel from './BrainMapPanel';
import ReportPanel from './ReportPanel';

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
  sourceNames: string[];
}

type Tab = 'chat' | 'quiz' | 'brainmap' | 'report';

export default function FeatureTabs({ sources, notebookId, hasSources, sourceNames }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  return (
    <div className="flex-1 flex flex-col bg-stone-50 min-h-0">
      <div className="flex border-b border-stone-200 bg-white flex-shrink-0">
        {[
          { id: 'chat', label: '💬 Chat' },
          { id: 'quiz', label: '📝 Quiz' },
          { id: 'brainmap', label: '🧠 Brain Map' },
          { id: 'report', label: '📄 Report' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === tab.id
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 relative">
        {activeTab === 'chat' && (
          <div className="absolute inset-0">
            <ChatPanel
              key={`chat-${notebookId}`}
              sources={sources}
              notebookId={notebookId}
              sourceNames={sourceNames}
            />
          </div>
        )}
        {activeTab === 'quiz' && (
          <div className="absolute inset-0 overflow-y-auto">
            <QuizPanel
              key={`quiz-${notebookId}`}
              sources={sources}
              notebookId={notebookId}
              hasSources={hasSources}
            />
          </div>
        )}
        {activeTab === 'brainmap' && (
          <div className="absolute inset-0">
            <BrainMapPanel
              key={`brainmap-${notebookId}`}
              sources={sources}
              notebookId={notebookId}
              hasSources={hasSources}
            />
          </div>
        )}
        {activeTab === 'report' && (
          <div className="absolute inset-0 overflow-y-auto">
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