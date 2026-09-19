'use client';

import { useState } from 'react';
import UserMenu from './UserMenu';

export interface Notebook {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  userName: string;
  userEmail: string;
  userImage?: string;
  notebooks: Notebook[];
  onOpen: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  maxNotebooks: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Burning the midnight oil';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export default function Dashboard({
  userName,
  userEmail,
  userImage,
  notebooks,
  onOpen,
  onCreate,
  onDelete,
  maxNotebooks,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);

  const firstName = userName.split(' ')[0] || 'there';
  const greeting = getGreeting();
  const atLimit = notebooks.length >= maxNotebooks;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreatingLoading(true);
    try {
      await onCreate(name);
      setNewName('');
      setCreating(false);
    } finally {
      setCreatingLoading(false);
    }
  };

  const handleDelete = async (nb: Notebook, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${nb.name}"? All its sources and chats will be lost.`)) return;
    await onDelete(nb.id);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-stone-200 bg-white">
        <span className="text-lg font-semibold text-stone-900">🧠 PadhAI</span>
        <UserMenu userName={userName} userEmail={userEmail} userImage={userImage} />
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-stone-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-stone-500 mt-2">
            {notebooks.length === 0
              ? 'Create your first notebook to get started.'
              : `You have ${notebooks.length} notebook${notebooks.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notebooks.map((nb) => (
            <div
              key={nb.id}
              onClick={() => onOpen(nb.id)}
              className="group bg-white rounded-xl border border-stone-200 p-5 cursor-pointer hover:border-stone-400 hover:shadow-md transition relative"
            >
              <div className="text-3xl mb-3">📓</div>
              <h3 className="font-semibold text-stone-900 truncate pr-6" title={nb.name}>
                {nb.name}
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Updated {new Date(nb.updated_at).toLocaleDateString()}
              </p>

              <button
                onClick={(e) => handleDelete(nb, e)}
                className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                title="Delete notebook"
              >
                🗑️
              </button>
            </div>
          ))}

          {/* Create new card */}
          {!atLimit && (
            <div
              onClick={() => setCreating(true)}
              className="bg-stone-50 rounded-xl border-2 border-dashed border-stone-300 p-5 cursor-pointer hover:border-stone-500 hover:bg-stone-100 transition flex flex-col items-center justify-center min-h-[140px]"
            >
              <div className="w-12 h-12 rounded-full bg-stone-900 text-white flex items-center justify-center text-2xl mb-3">
                +
              </div>
              <p className="text-sm font-medium text-stone-700">New Notebook</p>
            </div>
          )}
        </div>

        {atLimit && (
          <p className="text-sm text-stone-500 mt-6 text-center">
            You've reached the limit of {maxNotebooks} notebooks. Delete one to create more.
          </p>
        )}
      </main>

      {/* Floating action button (mobile-friendly) */}
      {!atLimit && (
        <button
          onClick={() => setCreating(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-stone-900 text-white text-3xl flex items-center justify-center shadow-lg hover:bg-stone-700 transition lg:hidden"
          title="New notebook"
        >
          +
        </button>
      )}

      {/* Create modal */}
      {creating && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => !creatingLoading && setCreating(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-stone-900 mb-4">
              Create a new notebook
            </h2>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setCreating(false);
                  setNewName('');
                }
              }}
              placeholder="e.g., Physics Notes, Project Ideas..."
              disabled={creatingLoading}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName('');
                }}
                disabled={creatingLoading}
                className="px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creatingLoading}
                className="px-4 py-2 text-sm bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creatingLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
