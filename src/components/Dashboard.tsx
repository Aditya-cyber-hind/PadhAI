'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import UserMenu from './UserMenu';
import Logo from './Logo';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import { cardGrid, cardItem, modalBackdrop, modalDialog } from '@/lib/motion';
import ConfirmModal from './ConfirmModal';

export interface Notebook {
  id: string;
  name: string;
  emoji: string | null;
  notebook_type?: 'study' | 'coding';
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
  onCreate: (name: string, notebookType?: 'study' | 'coding') => Promise<void>;
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

const GREETINGS = {
  lateNight: [
    'Burning the midnight oil',
    'Still going strong',
    'The night is young',
    'Quiet hours, sharp mind',
    'Studying past your bedtime',
  ],
  morning: [
    'Good morning',
    'Rise and grind',
    'Fresh start',
    'Morning, scholar',
    'Early bird catches the grade',
    'The day is yours',
  ],
  afternoon: [
    'Good afternoon',
    'Back at it',
    'Ready for round two',
    'Afternoon focus',
    'Halfway through the day',
    'Keep the momentum',
  ],
  evening: [
    'Good evening',
    'Golden hour study session',
    'Winding down or gearing up',
    'Evening, scholar',
    'One more chapter',
    'The quiet hours begin',
  ],
  night: [
    'Good night',
    'Late-night learning',
    'Last push before bed',
    'The night owls are up',
    'Burning the candle',
  ],
};

function getGreeting(): string {
  const hour = new Date().getHours();
  let bucket: keyof typeof GREETINGS;

  if (hour < 5) bucket = 'lateNight';
  else if (hour < 12) bucket = 'morning';
  else if (hour < 17) bucket = 'afternoon';
  else if (hour < 21) bucket = 'evening';
  else bucket = 'night';

  const pool = GREETINGS[bucket];

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return pool[dayOfYear % pool.length];
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
  const [newType, setNewType] = useState<'study' | 'coding'>('study');
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notebook | null>(null);

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
      await onCreate(name, newType);
      setNewName('');
      setNewType('study');
      setCreating(false);
    } finally {
      setCreatingLoading(false);
    }
  };

  const handleDeleteClick = (nb: Notebook, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(nb);
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    const nb = deleteTarget;
    setDeleteTarget(null);
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
      <header className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-6 border-b border-stone-200 bg-white sticky top-0 z-10">
        <Logo size={22} showWordmark={false} />

        <div className="flex-1 max-w-md mx-2 sm:mx-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full px-2.5 py-1.5 sm:px-3 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent"
            style={{ fontSize: '16px' }}
          />
        </div>

        <UserMenu userName={userName} userEmail={userEmail} userImage={userImage} />
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-10">
        <section className="mb-6 sm:mb-12">
          <p className="text-xs sm:text-sm text-stone-500 mb-1 sm:mb-2">
            {formatFullDate()}
          </p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-stone-900 mb-2 sm:mb-3 leading-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm sm:text-base text-stone-600">
            {notebooks.length === 0
              ? 'Create your first notebook to get started.'
              : `${notebooks.length} notebook${notebooks.length === 1 ? '' : 's'}${
                  totalMessages > 0 ? ` · ${totalMessages} message${totalMessages === 1 ? '' : 's'}` : ''
                }.`}
          </p>
        </section>

        {recentNotebooks.length > 0 && !search && (
          <section className="mb-6 sm:mb-12">
            <h2 className="text-[11px] sm:text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2 sm:mb-4">
              Continue
            </h2>

            <motion.div
              variants={cardGrid}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4"
            >
              {recentNotebooks.map((nb) => {
                const color = colorFor(nb.name);
                return (
                  <CardSpotlight key={nb.id} className="rounded-lg sm:rounded-xl">
                    <motion.button
                      variants={cardItem}
                      onClick={() => onOpen(nb.id)}
                      className={`relative text-left w-full p-3 sm:p-5 rounded-lg sm:rounded-xl border ${color.border} ${color.bg} hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />

                      <div className="relative">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-xl sm:text-2xl shadow-sm mb-2 sm:mb-3">
                          {emojiFor(nb)}
                        </div>
                        <h3 className={`font-semibold text-sm sm:text-base ${color.text} mb-1 sm:mb-2 truncate`} title={nb.name}>
                          {nb.name}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-stone-500">
                          Opened {formatRelativeDate(nb.updated_at)}
                        </p>
                      </div>
                    </motion.button>
                  </CardSpotlight>
                );
              })}
            </motion.div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h2 className="text-[11px] sm:text-sm font-semibold text-stone-500 uppercase tracking-wide">
              {search ? `Results (${filteredNotebooks.length})` : `All notebooks`}
            </h2>
            {notebooks.length > 0 && (
              <span className="text-[11px] sm:text-xs text-stone-400">
                {notebooks.length}/{maxNotebooks}
              </span>
            )}
          </div>

          <motion.div
            variants={cardGrid}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4"
          >
            {filteredNotebooks.map((nb) => {
              const color = colorFor(nb.name);
              const isRegenerating = regeneratingId === nb.id;
              return (
                <CardSpotlight key={nb.id} className="rounded-lg sm:rounded-xl">
                  <motion.div
                    variants={cardItem}
                    onClick={() => onOpen(nb.id)}
                    className="group relative h-full bg-white rounded-lg sm:rounded-xl border border-stone-200 p-3 sm:p-5 cursor-pointer hover:border-accent-300 hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-50/0 via-transparent to-accent-50/0 group-hover:from-accent-50/60 group-hover:to-transparent transition-all duration-300 pointer-events-none" />

                    <div className="relative">
                      <div
                        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full ${color.accent} flex items-center justify-center text-white text-base sm:text-lg shadow-sm mb-2 sm:mb-3`}
                      >
                        {emojiFor(nb)}
                      </div>

                      <h3 className="font-semibold text-xs sm:text-base text-stone-900 truncate pr-12 sm:pr-16" title={nb.name}>
                        {nb.name}
                      </h3>

                      <p className="text-[10px] sm:text-xs text-stone-400 mt-0.5 sm:mt-1">
                        {formatRelativeDate(nb.updated_at)}
                      </p>

                      {nb.message_count !== undefined && nb.message_count > 0 && (
                        <p className="hidden sm:block text-xs text-stone-500 mt-2">
                          💬 {nb.message_count}
                        </p>
                      )}

                      <div
                        className="absolute top-0 right-0 flex items-center gap-1
                                   opacity-100
                                   [@media(hover:hover)]:opacity-0
                                   [@media(hover:hover)]:group-hover:opacity-100
                                   transition"
                      >
                        {onRegenerateEmoji && (
                          <button
                            onClick={(e) => handleRegenerateEmoji(nb, e)}
                            disabled={isRegenerating}
                            className="p-1.5 text-stone-400 hover:text-accent-600 disabled:opacity-40 rounded-lg hover:bg-white transition"
                            title="Regenerate emoji"
                          >
                            {isRegenerating ? '⏳' : '🎲'}
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteClick(nb, e)}
                          className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-white transition"
                          title="Delete notebook"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </CardSpotlight>
              );
            })}

            {!atLimit && !search && (
              <div
                onClick={() => setCreating(true)}
                className="group relative bg-white rounded-lg sm:rounded-xl border-2 border-dashed border-stone-300 p-3 sm:p-5 cursor-pointer hover:border-accent-400 hover:shadow-lg transition-all flex flex-col items-center justify-center min-h-[100px] sm:min-h-[160px] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent-50/0 to-accent-50/0 group-hover:from-accent-50/80 group-hover:to-accent-100/40 transition-all duration-300 pointer-events-none" />
                <div className="relative flex flex-col items-center">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 text-white flex items-center justify-center text-lg sm:text-xl mb-1.5 sm:mb-3 shadow-md group-hover:scale-105 transition-transform">
                    +
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-stone-700">New</p>
                </div>
              </div>
            )}

            {search && filteredNotebooks.length === 0 && (
              <div className="col-span-full text-center py-8 sm:py-12 text-stone-400">
                <p className="text-3xl sm:text-4xl mb-2 sm:mb-3">🔍</p>
                <p className="text-sm">No matches for "{search}"</p>
              </div>
            )}
          </motion.div>

          {atLimit && (
            <p className="text-xs sm:text-sm text-stone-500 mt-4 sm:mt-6 text-center">
              Limit reached ({maxNotebooks}). Delete one to create more.
            </p>
          )}
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white relative overflow-hidden">
        <div
          className="absolute -left-32 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none opacity-30"
          style={{
            background:
              'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(251, 191, 36, 0) 70%)',
          }}
        />

        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-6 relative">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <Logo size={20} showWordmark={false} />
              <div className="flex flex-col leading-tight">
                <span className="font-display text-sm font-bold text-stone-900 tracking-tight">
                  Padh<span className="italic">AI</span>
                </span>
                <span className="text-[10px] text-stone-400 tracking-wide">
                  study workspace for the next generation
                </span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 flex-1 justify-center max-w-xs">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full bg-stone-200"
                  style={{
                    opacity: 0.3 + (i % 3) * 0.2,
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-stone-400">
              <a
                href="https://github.com/Aditya-cyber-hind"
                target="_blank"
                rel="noopener noreferrer"
                className="relative group hover:text-accent-600 transition-colors"
              >
                <span>Aditya</span>
                <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-accent-500 scale-x-0 group-hover:scale-x-100 origin-left transition-transform" />
              </a>
              <span className="text-stone-300">·</span>
              <a
                href="https://github.com/Aditya-cyber-hind/PadhAI"
                target="_blank"
                rel="noopener noreferrer"
                className="relative group hover:text-accent-600 transition-colors"
              >
                <span>GitHub</span>
                <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-accent-500 scale-x-0 group-hover:scale-x-100 origin-left transition-transform" />
              </a>
              <span className="text-stone-300">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-stone-500">v0.6</span>
              </span>
              <span className="text-stone-300">·</span>
              <span className="text-stone-500">MIT</span>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {creating && (
          <motion.div
            variants={modalBackdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => !creatingLoading && setCreating(false)}
          >
            <motion.div
              variants={modalDialog}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl p-5 sm:p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mb-4">
                Create a new notebook
              </h2>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setNewType('study')}
                  disabled={creatingLoading}
                  className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                    newType === 'study'
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-stone-200 hover:border-stone-300'
                  } disabled:opacity-60`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">📚</span>
                    <span className="font-semibold text-sm text-stone-900">Study</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-tight">
                    Chat, quizzes, flashcards
                  </p>
                  {newType === 'study' && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setNewType('coding')}
                  disabled={creatingLoading}
                  className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                    newType === 'coding'
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-stone-200 hover:border-stone-300'
                  } disabled:opacity-60`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">⌨️</span>
                    <span className="font-semibold text-sm text-stone-900">Coding</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-tight">
                    Coder mode, code snippets
                  </p>
                  {newType === 'coding' && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-500" />
                  )}
                </button>
              </div>

              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') {
                    setCreating(false);
                    setNewName('');
                    setNewType('study');
                  }
                }}
                placeholder={
                  newType === 'coding'
                    ? 'e.g., LeetCode Practice'
                    : 'e.g., Physics Notes'
                }
                disabled={creatingLoading}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 mb-4"
                style={{ fontSize: '16px' }}
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setCreating(false);
                    setNewName('');
                    setNewType('study');
                  }}
                  disabled={creatingLoading}
                  className="px-3.5 py-2 sm:px-4 text-sm border border-stone-300 rounded-lg hover:bg-stone-100 disabled:opacity-40 transition"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreate}
                  disabled={!newName.trim() || creatingLoading}
                  className="px-3.5 py-2 sm:px-4 text-sm bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {creatingLoading ? 'Creating...' : 'Create'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={deleteTarget !== null}
        title={deleteTarget ? `Delete "${deleteTarget.name}"?` : 'Delete notebook?'}
        description="All its sources, chats, quizzes, flashcards, and everything else in this notebook will be permanently lost. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}