'use client';

import { useState, useRef, useEffect } from 'react';
import UserMenu from './UserMenu';
import ShareModal from './ShareModal';
import NotebookSettingsModal from './NotebookSettingsModal';

interface Props {
  notebookId: string;
  notebookName: string;
  customInstructions?: string | null;
  userName: string;
  userEmail: string;
  userImage?: string;
  onBack: () => void;
  onRename: (name: string) => Promise<void>;
  onSettingsSaved?: (updates: {
    name?: string;
    custom_instructions?: string | null;
  }) => void;
}

export default function WorkspaceHeader({
  notebookId,
  notebookName,
  customInstructions,
  userName,
  userEmail,
  userImage,
  onBack,
  onRename,
  onSettingsSaved,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notebookName);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setValue(notebookName);
  }, [notebookName]);

  const commit = async () => {
    const name = value.trim();
    if (name && name !== notebookName) {
      await onRename(name);
    } else {
      setValue(notebookName);
    }
    setEditing(false);
  };

  const hasCustomInstructions = Boolean(
    customInstructions && customInstructions.trim().length > 0
  );

  return (
    <>
      <header className="h-14 flex-shrink-0 border-b border-stone-200 bg-white flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-accent-50 hover:text-accent-700 transition flex-shrink-0"
            title="Back to dashboard"
          >
            ← Dashboard
          </button>

          <span className="text-stone-300 flex-shrink-0">|</span>

          {editing ? (
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') {
                  setValue(notebookName);
                  setEditing(false);
                }
              }}
              className="text-sm font-medium px-2 py-1 border border-accent-400 rounded bg-white focus:outline-none focus:ring-2 focus:ring-accent-400 min-w-0 flex-1"
            />
          ) : (
            <button
              onDoubleClick={() => setEditing(true)}
              className="font-display text-base font-bold text-stone-900 truncate px-2 py-1 rounded hover:bg-stone-100 transition text-left min-w-0"
              title="Double-click to rename"
            >
              {notebookName}
            </button>
          )}

          {hasCustomInstructions && (
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-50 border border-accent-200 text-accent-700 flex-shrink-0"
              title="This notebook has custom instructions"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
              Custom
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-1.5 rounded-lg text-sm text-stone-600 border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition"
            title="Notebook settings"
          >
            ⚙️<span className="hidden sm:inline ml-1">Settings</span>
          </button>

          <button
            onClick={() => setShareOpen(true)}
            className="px-3 py-1.5 rounded-lg text-sm text-accent-700 border border-accent-200 hover:bg-accent-50 hover:border-accent-300 transition"
            title="Share this notebook"
          >
            🔗<span className="hidden sm:inline ml-1">Share</span>
          </button>

          <UserMenu userName={userName} userEmail={userEmail} userImage={userImage} />
        </div>
      </header>

      {shareOpen && (
        <ShareModal
          notebookId={notebookId}
          notebookName={notebookName}
          onClose={() => setShareOpen(false)}
        />
      )}

      <NotebookSettingsModal
        open={settingsOpen}
        notebookId={notebookId}
        notebookName={notebookName}
        currentInstructions={customInstructions ?? null}
        onClose={() => setSettingsOpen(false)}
        onSaved={(updates) => {
          onSettingsSaved?.(updates);
        }}
      />
    </>
  );
}