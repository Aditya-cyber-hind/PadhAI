'use client';

import { useState, useMemo } from 'react';
import UserMenu from './UserMenu';

export interface Notebook {
  id: string;
  name: string;
  emoji: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  request_count?: number;
}

interface Props {
  userName: string;
  userEmail: string;
  userImage?: string;
  notebooks: Notebook[];
  onOpen: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRegenerateEmoji?: (id: string) => Promise<void>;
  maxNotebooks: number;
}

const PALETTE = [
  { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-500', text: 'text-blue-700' },
  { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-500', text: 'text-purple-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-500', text: 'text-emerald-700' },
  { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-500', text: 'text-amber-700' },
  { bg: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-500', text: 'text-rose-700' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', accent: 'bg-cyan-500', text: 'text-cyan-700' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'bg-indigo-500', text: 'text-indigo-700' },
  { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'bg-orange-500', text: 'text-orange-700' },
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Burning the midnight oil';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatFullDate(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function Dashboard({
  userName,
  userEmail,
  userImage,
  notebooks,
  onOpen,
  onCreate,
  onDelete,
  onRegenerateEmoji,
  maxNotebooks,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const firstName = userName.split(' ')[0] || 'there';
  const greeting = getGreeting();
  const atLimit = notebooks.length >= maxNotebooks;

  const recentNotebooks = useMemo(
    () => [...notebooks].sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    ).slice(0, 3),
    [notebooks]
  );

  const filteredNotebooks = useMemo(() => {
    if (!search.trim()) return notebooks;
    const q = search.toLowerCase();
    return notebooks.filter((n) => n.name.toLowerCase().includes(q));
  }, [notebooks, search]);

  const totalMessages = notebooks.reduce((sum, n) => sum + (n.message_count ?? 0), 0);

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

  const handleRegenerateEmoji = async (nb: Notebook, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRegenerateEmoji || regeneratingId) return;
    setRegeneratingId(nb.id);
    try {
      await onRegenerateEmoji(nb.id);
    } finally {
      setRegeneratingId(null);
    }
  };

  const emojiFor = (nb: Notebook) => nb.emoji || '📓';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="h-14 flex items-center justify-between px-6 border-b border-stone-200 bg-white sticky top-0 z-10">
        <span className="text-lg font-semibold text-stone-900">🧠 PadhAI</span>

        <div className="flex-1 max-w-md mx-6 hidden sm:block">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notebooks..."
            className="w-full px-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
          />
        </div>

        <UserMenu userName={userName} userEmail={userEmail} userImage={userImage} />
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <section className="mb-12">
          <p className="text-sm text-stone-500 mb-2">{formatFullDate()}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-3">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-stone-600">
            {notebooks.length === 0
              ? 'Your workspace is empty. Create your first notebook to get started.'
              : `You have ${notebooks.length} notebook${notebooks.length === 1 ? '' : 's'}${
                  totalMessages > 0 ? ` · ${totalMessages} message${totalMessages === 1 ? '' : 's'} exchanged` : ''
                }.`}
          </p>
        </section>

        {recentNotebooks.length > 0 && !search && (
          <section className="mb-12">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
              Continue where you left off
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recentNotebooks.map((nb) => {
                const color = colorFor(nb.name);
                return (
                  <button
                    key={nb.id}
                    onClick={() => onOpen(nb.id)}
                    className={`text-left p-5 rounded-xl border ${color.border} ${color.bg} hover:shadow-md transition-all group`}
                  >
                    <div className="text-3xl mb-3">{emojiFor(nb)}</div>
                    <h3 className={`font-semibold ${color.text} mb-2 truncate`} title={nb.name}>
                      {nb.name}
                    </h3>
                    <p className="text-xs text-stone-500">
                      Opened {formatRelativeDate(nb.updated_at)}
                    </p>
                    {nb.message_count !== undefined && nb.message_count > 0 && (
                      <p className="text-xs text-stone-500 mt-1">
                        {nb.message_count} message{nb.message_count === 1 ? '' : 's'}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
              {search ? `Search results (${filteredNotebooks.length})` : `All notebooks`}
            </h2>
            {notebooks.length > 0 && (
              <span className="text-xs text-stone-400">
                {notebooks.length} of {maxNotebooks}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredNotebooks.map((nb) => {
              const color = colorFor(nb.name);
              const isRegenerating = regeneratingId === nb.id;
              return (
                <div
                  key={nb.id}
                  onClick={() => onOpen(nb.id)}
                  className="group bg-white rounded-xl border border-stone-200 p-5 cursor-pointer hover:border-stone-400 hover:shadow-md transition relative"
                >
                  <div
                    className={`w-10 h-10 rounded-lg ${color.accent} flex items-center justify-center text-white text-lg mb-3`}
                  >
                    {emojiFor(nb)}
                  </div>

                  <h3 className="font-semibold text-stone-900 truncate pr-20" title={nb.name}>
                    {nb.name}
                  </h3>

                  <p className="text-xs text-stone-400 mt-1">
                    Updated {formatRelativeDate(nb.updated_at)}
                  </p>

                  {(nb.message_count !== undefined && nb.message_count > 0) && (
                    <p className="text-xs text-stone-500 mt-2">
                      💬 {nb.message_count} message{nb.message_count === 1 ? '' : 's'}
                    </p>
                  )}

                  {/*
                    Action buttons. Always visible on touch devices (no hover
                    capability). Hover-revealed on desktop. Uses @media(hover)
                    so hybrid devices (Surface, iPad + mouse) get hover behavior.
                  */}
                  <div
                    className="absolute top-2 right-2 flex items-center gap-1
                               opacity-100
                               [@media(hover:hover)]:opacity-0
                               [@media(hover:hover)]:group-hover:opacity-100
                               transition"
                  >
                    {onRegenerateEmoji && (
                      <button
                        onClick={(e) => handleRegenerateEmoji(nb, e)}
                        disabled={isRegenerating}
                        className="p-2.5 [@media(hover:hover)]:p-1.5
                                   text-stone-400 [@media(hover:hover)]:text-stone-300
                                   hover:text-stone-700 disabled:opacity-40
                                   rounded-lg hover:bg-stone-100"
                        title="Regenerate emoji"
                        aria-label="Regenerate emoji"
                      >
                        {isRegenerating ? '⏳' : '🎲'}
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(nb, e)}
                      className="p-2.5 [@media(hover:hover)]:p-1.5
                                 text-stone-400 [@media(hover:hover)]:text-stone-300
                                 hover:text-red-600
                                 rounded-lg hover:bg-red-50"
                      title="Delete notebook"
                      aria-label="Delete notebook"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}

            {!atLimit && !search && (
              <div
                onClick={() => setCreating(true)}
                className="bg-stone-50 rounded-xl border-2 border-dashed border-stone-300 p-5 cursor-pointer hover:border-stone-500 hover:bg-stone-100 transition flex flex-col items-center justify-center min-h-[160px]"
              >
                <div className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center text-xl mb-3">
                  +
                </div>
                <p className="text-sm font-medium text-stone-700">New Notebook</p>
              </div>
            )}

            {search && filteredNotebooks.length === 0 && (
              <div className="col-span-full text-center py-12 text-stone-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm">No notebooks match "{search}"</p>
              </div>
            )}
          </div>

          {atLimit && (
            <p className="text-sm text-stone-500 mt-6 text-center">
              You've reached the limit of {maxNotebooks} notebooks. Delete one to create more.
            </p>
          )}
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>
            🧠 PadhAI · Built by{' '}
            <a
              href="https://github.com/Aditya-cyber-hind"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-700 hover:text-stone-900 underline"
            >
              Aditya Choudhary
            </a>
          </p>
          <p>v0.6 · Free · Open source</p>
        </div>
      </footer>

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