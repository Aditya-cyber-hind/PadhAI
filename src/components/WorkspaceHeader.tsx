'use client';

import { useState, useRef, useEffect } from 'react';
import UserMenu from './UserMenu';

interface Props {
  notebookName: string;
  userName: string;
  userEmail: string;
  userImage?: string;
  onBack: () => void;
  onRename: (name: string) => Promise<void>;
}

export default function WorkspaceHeader({
  notebookName,
  userName,
  userEmail,
  userImage,
  onBack,
  onRename,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notebookName);
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

  return (
    <header className="h-14 flex-shrink-0 border-b border-stone-200 bg-white flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition flex-shrink-0"
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
            className="text-sm font-medium px-2 py-1 border border-stone-400 rounded bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 min-w-0 flex-1"
          />
        ) : (
          <button
            onDoubleClick={() => setEditing(true)}
            className="text-sm font-medium text-stone-900 truncate px-2 py-1 rounded hover:bg-stone-100 transition text-left min-w-0"
            title="Double-click to rename"
          >
            {notebookName}
          </button>
        )}
      </div>

      <UserMenu userName={userName} userEmail={userEmail} userImage={userImage} />
    </header>
  );
} 
