'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import UserMenu from './UserMenu';
import Logo from './Logo';
import { CardSpotlight } from '@/components/ui/card-spotlight';
import { cardGrid, cardItem, modalBackdrop, modalDialog } from '@/lib/motion';
import ConfirmModal from './ConfirmModal';
import { celebrateSmall } from '@/lib/confetti';

export interface Notebook {
  id: string;
  name: string;
  emoji: string | null;
  cover_image_url?: string | null;
  notebook_type?: 'study' | 'coding';
  custom_instructions?: string | null;
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  request_count?: number;
}

interface FolderItem {
  id: string;
  name: string;
  color: string | null;
  notebook_count: number;
}

interface Props {
  userName: string;
  userEmail: string;
  userImage?: string;
  notebooks: Notebook[];
  onOpen: (id: string) => void;
  onCreate: (
    name: string,
    notebookType?: 'study' | 'coding',
    folderId?: string | null
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRegenerateEmoji?: (id: string) => Promise<void>;
  onMove?: (notebookId: string, folderId: string | null) => Promise<void>;
  maxNotebooks: number;
}

type CreateKind = 'study' | 'coding' | 'folder';

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

function useCoverFallback(coverUrl: string | null | undefined) {
  const [failed, setFailed] = useState(false);
  const hasCover = Boolean(coverUrl) && !failed;
  return {
    hasCover,
    coverUrl: coverUrl || null,
    onError: () => setFailed(true),
  };
}

const actionStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.08 },
  },
};
const actionChild = {
  hidden: { opacity: 0, x: 4 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function Dashboard({
  userName,
  userEmail,
  userImage,
  notebooks,
  onOpen,
  onCreate,
  onDelete,
  onRegenerateEmoji,
  onMove,
  maxNotebooks,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<CreateKind>('study');
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notebook | null>(null);
  const [moveTarget, setMoveTarget] = useState<Notebook | null>(null);
  const [createError, setCreateError] = useState('');

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderItem | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const firstName = userName.split(' ')[0] || 'there';
  const greeting = getGreeting();
  const atLimit = notebooks.length >= maxNotebooks;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.folders)) setFolders(data.folders);
    } catch (err) {
      console.error('[folders] load failed:', err);
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const openFolder = openFolderId
    ? folders.find((f) => f.id === openFolderId) ?? null
    : null;

  const currentNotebooks = useMemo(() => {
    if (openFolderId) {
      return notebooks.filter((n) => n.folder_id === openFolderId);
    }
    return notebooks.filter((n) => !n.folder_id);
  }, [notebooks, openFolderId]);

  const recentNotebooks = useMemo(
    () =>
      [...currentNotebooks]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        .slice(0, 3),
    [currentNotebooks]
  );

  const filteredNotebooks = useMemo(() => {
    if (!search.trim()) return currentNotebooks;
    const q = search.toLowerCase();
    return currentNotebooks.filter((n) => n.name.toLowerCase().includes(q));
  }, [currentNotebooks, search]);

  const filteredFolders = useMemo(() => {
    if (openFolderId) return [];
    if (!search.trim()) return folders;
    const q = search.toLowerCase();
    return folders.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, search, openFolderId]);

  const totalMessages = notebooks.reduce(
    (sum, n) => sum + (n.message_count ?? 0),
    0
  );

  const resetCreateForm = () => {
    setNewName('');
    setNewKind('study');
    setCreateError('');
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreatingLoading(true);
    setCreateError('');
    try {
      if (newKind === 'folder') {
        const res = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create folder');
        await loadFolders();
        setCreating(false);
        resetCreateForm();
        celebrateSmall();
        return;
      }

      await onCreate(name, newKind, openFolderId);
      setCreating(false);
      resetCreateForm();
      celebrateSmall();
      await loadFolders();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Creation failed');
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
    await loadFolders();
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

  const handleMoveClick = (nb: Notebook, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onMove) return;
    setMoveTarget(nb);
  };

  const handleRenameFolder = async (folderId: string) => {
    const name = renameValue.trim();
    if (!name) {
      setRenamingFolderId(null);
      return;
    }
    setRenameError('');
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rename failed');
      setRenamingFolderId(null);
      await loadFolders();
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const onConfirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    const target = deleteFolderTarget;
    setDeleteFolderTarget(null);
    try {
      const res = await fetch(`/api/folders/${target.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      if (openFolderId === target.id) setOpenFolderId(null);
      await loadFolders();
    } catch (err) {
      console.error('[folders] delete failed:', err);
    }
  };

  const openCreate = (kind: CreateKind = 'study') => {
    setCreating(true);
    resetCreateForm();
    setNewKind(kind);
  };

  const emojiFor = (nb: Notebook) => nb.emoji || '📓';

  const showingSearchResults = Boolean(search.trim());
  const isRootEmpty =
    !openFolderId &&
    notebooks.length === 0 &&
    folders.length === 0 &&
    !showingSearchResults;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-6 border-b border-stone-200 bg-white sticky top-0 z-50">
        <Logo size={22} showWordmark={false} />

        <div className="flex-1 max-w-md mx-2 sm:mx-6">
          <div
            className={`relative transition-all ${
              searchFocused
                ? 'ring-2 ring-accent-300/60 ring-offset-2 ring-offset-white rounded-lg'
                : ''
            }`}
          >
            <span
              className={`absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                searchFocused ? 'text-accent-600' : 'text-stone-400'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={
                openFolder ? `Search in ${openFolder.name}...` : 'Search...'
              }
              className="w-full pl-8 pr-14 py-1.5 sm:py-2 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:bg-white focus:outline-none focus:border-accent-300 transition-colors"
              style={{ fontSize: '16px' }}
            />
            {search ? (
              <button
                onClick={() => {
                  setSearch('');
                  searchRef.current?.focus();
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                title="Clear search"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center justify-center w-5 h-5 text-[10px] text-stone-400 border border-stone-200 rounded bg-white font-mono">
                /
              </span>
            )}
          </div>
        </div>

        <UserMenu userName={userName} userEmail={userEmail} userImage={userImage} />
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-10">
        {openFolder ? (
          <motion.section
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-10"
          >
            <button
              onClick={() => {
                setOpenFolderId(null);
                setSearch('');
              }}
              className="group inline-flex items-center gap-1.5 text-xs sm:text-sm text-stone-500 hover:text-accent-600 mb-3 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              All notebooks
            </button>
            <div className="flex items-center gap-3">
              <FolderIconShell size="lg" />
              <div className="min-w-0">
                {renamingFolderId === openFolder.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameFolder(openFolder.id);
                      if (e.key === 'Escape') setRenamingFolderId(null);
                    }}
                    onBlur={() => handleRenameFolder(openFolder.id)}
                    className="font-display text-2xl sm:text-3xl font-bold text-stone-900 bg-transparent border-b border-accent-400 focus:outline-none"
                    style={{ fontSize: '16px' }}
                  />
                ) : (
                  <h1
                    className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 truncate cursor-text hover:text-accent-700 transition-colors"
                    onClick={() => {
                      setRenamingFolderId(openFolder.id);
                      setRenameValue(openFolder.name);
                      setRenameError('');
                    }}
                    title="Click to rename"
                  >
                    {openFolder.name}
                  </h1>
                )}
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  {currentNotebooks.length} notebook
                  {currentNotebooks.length === 1 ? '' : 's'}
                  {renameError && (
                    <span className="text-red-600 ml-2">{renameError}</span>
                  )}
                </p>
              </div>
            </div>
          </motion.section>
        ) : (
          <section className="mb-6 sm:mb-10">
            <p className="text-xs sm:text-sm text-stone-500 mb-1 sm:mb-2">
              {formatFullDate()}
            </p>
            <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-stone-900 mb-2 sm:mb-3 leading-tight">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm sm:text-base text-stone-600">
              {isRootEmpty
                ? 'Your workspace is a blank canvas.'
                : `${notebooks.length} notebook${notebooks.length === 1 ? '' : 's'}${
                    folders.length > 0
                      ? ` · ${folders.length} folder${folders.length === 1 ? '' : 's'}`
                      : ''
                  }${
                    totalMessages > 0
                      ? ` · ${totalMessages} message${totalMessages === 1 ? '' : 's'}`
                      : ''
                  }.`}
            </p>
          </section>
        )}

        {isRootEmpty && (
          <RootEmptyState
            onCreateNotebook={() => openCreate('study')}
            onCreateFolder={() => openCreate('folder')}
          />
        )}

        {!openFolder && recentNotebooks.length > 0 && !showingSearchResults && !isRootEmpty && (
          <section className="mb-5 sm:mb-8">
            <h2 className="text-[11px] sm:text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2 sm:mb-3">
              Continue
            </h2>

            <motion.div
              variants={cardGrid}
              initial="hidden"
              animate="visible"
              className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible snap-x snap-mandatory"
            >
              {recentNotebooks.map((nb) => (
                <RecentCard
                  key={nb.id}
                  nb={nb}
                  onOpen={onOpen}
                  emojiFor={emojiFor}
                />
              ))}
            </motion.div>
          </section>
        )}

        {!isRootEmpty && (
          <section>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h2 className="text-[11px] sm:text-sm font-semibold text-stone-500 uppercase tracking-wide">
                {openFolder
                  ? showingSearchResults
                    ? `Results (${filteredNotebooks.length})`
                    : 'Notebooks in this folder'
                  : showingSearchResults
                  ? `Results (${filteredFolders.length + filteredNotebooks.length})`
                  : 'Your workspace'}
              </h2>
              {!openFolder && notebooks.length > 0 && (
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
              {!openFolder &&
                filteredFolders.map((f) => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    onOpen={() => {
                      setOpenFolderId(f.id);
                      setSearch('');
                    }}
                    onRename={() => {
                      setRenamingFolderId(f.id);
                      setRenameValue(f.name);
                      setRenameError('');
                    }}
                    onDelete={() => setDeleteFolderTarget(f)}
                  />
                ))}

              {filteredNotebooks.map((nb) => (
                <GridCard
                  key={nb.id}
                  nb={nb}
                  onOpen={onOpen}
                  onDelete={handleDeleteClick}
                  onRegenerateEmoji={
                    onRegenerateEmoji ? handleRegenerateEmoji : undefined
                  }
                  onMove={onMove ? handleMoveClick : undefined}
                  isRegenerating={regeneratingId === nb.id}
                  emojiFor={emojiFor}
                />
              ))}

              {!atLimit && !showingSearchResults && (
                <div
                  onClick={() => openCreate('study')}
                  className="group relative bg-white rounded-lg sm:rounded-xl border-2 border-dashed border-stone-300 p-3 sm:p-5 cursor-pointer hover:border-accent-400 hover:shadow-lg transition-all flex flex-col items-center justify-center min-h-[100px] sm:min-h-[160px] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-50/0 to-accent-50/0 group-hover:from-accent-50/80 group-hover:to-accent-100/40 transition-all duration-300 pointer-events-none" />
                  <div className="relative flex flex-col items-center">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 text-white flex items-center justify-center text-lg sm:text-xl mb-1.5 sm:mb-3 shadow-md group-hover:scale-105 transition-transform">
                      +
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-stone-700">
                      New
                    </p>
                  </div>
                </div>
              )}

              {showingSearchResults &&
                filteredFolders.length === 0 &&
                filteredNotebooks.length === 0 && (
                  <div className="col-span-full">
                    <SearchEmptyState
                      query={search}
                      onCreate={() => openCreate('study')}
                    />
                  </div>
                )}

              {openFolder &&
                !showingSearchResults &&
                filteredNotebooks.length === 0 &&
                !atLimit && (
                  <div className="col-span-full">
                    <FolderEmptyState />
                  </div>
                )}
            </motion.div>

            {atLimit && !openFolder && (
              <p className="text-xs sm:text-sm text-stone-500 mt-4 sm:mt-6 text-center">
                Limit reached ({maxNotebooks}). Delete one to create more.
              </p>
            )}
          </section>
        )}
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
                  style={{ opacity: 0.3 + (i % 3) * 0.2 }}
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
              <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mb-2">
                {newKind === 'folder' ? 'New folder' : 'New notebook'}
              </h2>
              <p className="text-[13px] text-stone-500 mb-5">
                {newKind === 'folder'
                  ? 'A folder holds related notebooks. You can move notebooks in later.'
                  : openFolder
                  ? `Creating inside "${openFolder.name}"`
                  : 'Pick what you want to work on.'}
              </p>

              <div className="grid grid-cols-3 gap-2.5 mb-5">
                <KindCard
                  active={newKind === 'study'}
                  onClick={() => setNewKind('study')}
                  disabled={creatingLoading}
                  icon="📚"
                  title="Study"
                  subtitle="Chat, quizzes"
                />
                <KindCard
                  active={newKind === 'coding'}
                  onClick={() => setNewKind('coding')}
                  disabled={creatingLoading}
                  icon="⌨️"
                  title="Coding"
                  subtitle="Coder mode"
                />
                <KindCard
                  active={newKind === 'folder'}
                  onClick={() => setNewKind('folder')}
                  disabled={creatingLoading || Boolean(openFolderId)}
                  icon="📁"
                  title="Folder"
                  subtitle={openFolderId ? 'Not here' : 'Group them'}
                />
              </div>

              <div className="relative mb-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                  {newKind === 'folder' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
                      <path d="M15 4v5h5" />
                    </svg>
                  )}
                </span>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (createError) setCreateError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') {
                      setCreating(false);
                      resetCreateForm();
                    }
                  }}
                  placeholder={
                    newKind === 'folder'
                      ? 'e.g., Physics'
                      : newKind === 'coding'
                      ? 'e.g., LeetCode Practice'
                      : 'e.g., Physics Notes'
                  }
                  disabled={creatingLoading}
                  className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <AnimatePresence>
                {createError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-[11px] text-red-600 mb-2"
                  >
                    {createError}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex justify-end gap-2 mt-1">
                <button
                  onClick={() => {
                    setCreating(false);
                    resetCreateForm();
                  }}
                  disabled={creatingLoading}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg disabled:opacity-40 transition"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreate}
                  disabled={!newName.trim() || creatingLoading}
                  className="px-4 py-2 text-sm bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                >
                  {creatingLoading
                    ? newKind === 'folder'
                      ? 'Creating folder...'
                      : 'Creating...'
                    : newKind === 'folder'
                    ? 'Create folder'
                    : 'Create'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moveTarget && onMove && (
          <motion.div
            variants={modalBackdrop}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setMoveTarget(null)}
          >
            <motion.div
              variants={modalDialog}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl p-5 sm:p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-lg">{emojiFor(moveTarget)}</span>
                <h2 className="font-display text-lg sm:text-xl font-bold text-stone-900 truncate">
                  Move "{moveTarget.name}"
                </h2>
              </div>
              <p className="text-[13px] text-stone-500 mb-4">
                Choose a folder, or keep it at the root.
              </p>
              <FolderPicker
                folders={folders}
                currentFolderId={moveTarget.folder_id ?? null}
                onPick={async (folderId) => {
                  await onMove(moveTarget.id, folderId);
                  setMoveTarget(null);
                  await loadFolders();
                }}
                onCancel={() => setMoveTarget(null)}
              />
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

      <ConfirmModal
        open={deleteFolderTarget !== null}
        title={
          deleteFolderTarget
            ? `Delete folder "${deleteFolderTarget.name}"?`
            : 'Delete folder?'
        }
        description="Notebooks inside will be moved to your workspace root. The notebooks themselves are not deleted."
        confirmLabel="Delete folder"
        variant="danger"
        onConfirm={onConfirmDeleteFolder}
        onCancel={() => setDeleteFolderTarget(null)}
      />
    </div>
  );
}

function KindCard({
  active,
  onClick,
  disabled,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative p-3.5 rounded-lg border-2 text-left transition-all duration-200 ${
        active
          ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-400/40 ring-offset-1 shadow-md'
          : 'border-stone-200 hover:border-stone-300 hover:-translate-y-0.5 hover:shadow-sm'
      } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="font-semibold text-[13px] text-stone-900">{title}</span>
      </div>
      <p className="text-[11px] text-stone-500 leading-tight">{subtitle}</p>
      {active && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-500 shadow-sm" />
      )}
    </button>
  );
}

function FolderIconShell({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const dims = size === 'lg' ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-9 h-9 sm:w-11 sm:h-11';
  return (
    <div className={`relative ${dims} shrink-0`}>
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-amber-200 to-amber-300 opacity-60 translate-x-1 translate-y-1" />
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 opacity-80 translate-x-0.5 translate-y-0.5" />
      <div className="relative w-full h-full rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-300 flex items-center justify-center shadow-sm">
        <svg width={size === 'lg' ? 22 : 16} height={size === 'lg' ? 22 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700">
          <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
        </svg>
      </div>
    </div>
  );
}

function FolderCard({
  folder,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: FolderItem;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <CardSpotlight className="rounded-lg sm:rounded-xl">
      <motion.div
        variants={cardItem}
        onClick={onOpen}
        className="group relative h-full aspect-[4/3] sm:aspect-[16/11] rounded-lg sm:rounded-xl border border-amber-200/70 overflow-hidden cursor-pointer hover:border-amber-400 hover:shadow-lg hover:-translate-y-0.5 transition-all bg-gradient-to-br from-amber-50/70 via-white to-white"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/0 via-transparent to-amber-100/0 group-hover:from-amber-100/40 group-hover:to-transparent transition-all duration-300 pointer-events-none" />

        <div className="relative h-full p-3 sm:p-5 flex flex-col">
          <div className="mb-2 sm:mb-3">
            <FolderIconShell size="sm" />
          </div>
          <h3
            className="font-display font-semibold text-xs sm:text-base text-stone-900 truncate pr-12 sm:pr-16"
            title={folder.name}
          >
            {folder.name}
          </h3>
          <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5 sm:mt-1">
            {folder.notebook_count}{' '}
            notebook{folder.notebook_count === 1 ? '' : 's'}
          </p>
        </div>

        <motion.div
          variants={actionStagger}
          initial="hidden"
          whileHover="visible"
          className="absolute top-0 right-0 flex items-center gap-1
                     opacity-100
                     [@media(hover:hover)]:opacity-0
                     [@media(hover:hover)]:group-hover:opacity-100
                     transition z-10"
        >
          <motion.button
            variants={actionChild}
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            className="p-1.5 text-stone-400 hover:text-amber-700 rounded-lg hover:bg-white/70 transition"
            title="Rename folder"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </motion.button>
          <motion.button
            variants={actionChild}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-white/70 transition"
            title="Delete folder"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </motion.button>
        </motion.div>
      </motion.div>
    </CardSpotlight>
  );
}

function RootEmptyState({
  onCreateNotebook,
  onCreateFolder,
}: {
  onCreateNotebook: () => void;
  onCreateFolder: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
      className="flex flex-col items-center text-center py-12 sm:py-20"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent-100 to-amber-100 opacity-50 blur-2xl scale-150" />
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-accent-50 to-amber-50 border border-accent-200 flex items-center justify-center shadow-lg">
          <svg width="52" height="52" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="12" width="14" height="28" rx="2" fill="currentColor" className="text-accent-200" />
            <rect x="22" y="8" width="14" height="32" rx="2" fill="currentColor" className="text-accent-300" />
            <rect x="38" y="14" width="4" height="26" rx="1" fill="currentColor" className="text-accent-400" />
          </svg>
        </div>
      </div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
        A blank workspace, ready for you
      </h2>
      <p className="text-sm sm:text-base text-stone-500 max-w-md mb-7 leading-relaxed">
        Create a notebook to upload documents and start studying, or a folder to
        keep related notebooks together.
      </p>
      <div className="flex flex-col sm:flex-row gap-2.5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onCreateNotebook}
          className="px-5 py-2.5 bg-accent-500 text-white rounded-lg hover:bg-accent-600 font-medium transition shadow-sm flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create notebook
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onCreateFolder}
          className="px-5 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-100 hover:border-stone-400 font-medium transition flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
          </svg>
          Create folder
        </motion.button>
      </div>
    </motion.div>
  );
}

function SearchEmptyState({
  query,
  onCreate,
}: {
  query: string;
  onCreate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-12 sm:py-16"
    >
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
            <path d="M8.5 11h5" strokeWidth="2" />
          </svg>
        </div>
      </div>
      <h3 className="font-display text-lg sm:text-xl font-semibold text-stone-900 mb-1.5">
        Nothing matched "{query}"
      </h3>
      <p className="text-sm text-stone-500 mb-5 max-w-sm">
        Try a different keyword — or start fresh with a new notebook.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 text-sm text-accent-600 hover:text-accent-700 font-medium transition"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Create a new notebook
      </button>
    </motion.div>
  );
}

function FolderEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-12 sm:py-16"
    >
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
            <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
            <path d="M9 13h6" opacity="0.5" strokeDasharray="2 2" />
          </svg>
        </div>
      </div>
      <h3 className="font-display text-lg sm:text-xl font-semibold text-stone-900 mb-1.5">
        This folder is empty
      </h3>
      <p className="text-sm text-stone-500 max-w-sm leading-relaxed">
        Move any notebook in with the{' '}
        <span className="inline-block px-1 py-0.5 rounded bg-stone-100 text-[11px] text-stone-700 font-medium">📁</span>{' '}
        icon, or create one inside with{' '}
        <span className="inline-block px-1.5 py-0.5 rounded bg-stone-100 text-[11px] text-stone-700 font-medium">
          + New
        </span>
      </p>
    </motion.div>
  );
}

function FolderPicker({
  folders,
  currentFolderId,
  onPick,
  onCancel,
}: {
  folders: FolderItem[];
  currentFolderId: string | null;
  onPick: (folderId: string | null) => Promise<void>;
  onCancel: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const click = async (id: string | null) => {
    setBusyId(id ?? '__unfiled__');
    try {
      await onPick(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-1 max-h-80 overflow-y-auto -mx-1 px-1">
      <button
        onClick={() => click(null)}
        disabled={busyId !== null}
        className={`group w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-2.5 ${
          currentFolderId === null
            ? 'bg-accent-50 text-accent-900 ring-1 ring-accent-200'
            : 'hover:bg-stone-100 text-stone-700'
        } disabled:opacity-60`}
      >
        <span className="shrink-0 text-stone-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
            <path d="M9 12l6 6M15 12l-6 6" opacity="0.55" />
          </svg>
        </span>
        <span className="flex-1 font-medium">No folder (root)</span>
        {currentFolderId === null && (
          <span className="text-accent-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
        )}
        {busyId === '__unfiled__' && (
          <span className="text-[10px] text-stone-400">…</span>
        )}
      </button>

      {folders.map((f) => (
        <button
          key={f.id}
          onClick={() => click(f.id)}
          disabled={busyId !== null}
          className={`group w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-2.5 ${
            currentFolderId === f.id
              ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
              : 'hover:bg-stone-100 text-stone-700'
          } disabled:opacity-60`}
        >
          <span
            className={`shrink-0 ${
              currentFolderId === f.id ? 'text-amber-600' : 'text-amber-500/70'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
            </svg>
          </span>
          <span className="flex-1 truncate">{f.name}</span>
          <span className="text-[11px] text-stone-400 tabular-nums">
            {f.notebook_count}
          </span>
          {currentFolderId === f.id && (
            <span className="text-amber-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          )}
          {busyId === f.id && (
            <span className="text-[10px] text-stone-400">…</span>
          )}
        </button>
      ))}

      {folders.length === 0 && (
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-stone-400 mb-1">No folders yet</p>
          <p className="text-[11px] text-stone-400">
            Create one from the <span className="text-stone-600 font-medium">+ New</span> card
          </p>
        </div>
      )}

      <button
        onClick={onCancel}
        className="mt-4 w-full px-3 py-2 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
      >
        Cancel
      </button>
    </div>
  );
}

function RecentCard({
  nb,
  onOpen,
  emojiFor,
}: {
  nb: Notebook;
  onOpen: (id: string) => void;
  emojiFor: (nb: Notebook) => string;
}) {
  const color = colorFor(nb.name);
  const { hasCover, coverUrl, onError } = useCoverFallback(nb.cover_image_url);

  return (
    <CardSpotlight className="rounded-lg sm:rounded-xl snap-start min-w-[70%] sm:min-w-0">
      <motion.button
        variants={cardItem}
        onClick={() => onOpen(nb.id)}
        className="relative text-left w-full aspect-[16/9] rounded-lg sm:rounded-xl border overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
        style={{ borderColor: hasCover ? 'rgba(0,0,0,0.08)' : undefined }}
      >
        {hasCover ? (
          <>
            <img
              src={coverUrl!}
              alt=""
              onError={onError}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/40 to-transparent" />
            <div className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-lg shadow-sm">
              {emojiFor(nb)}
            </div>
            <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4">
              <h3
                className="font-display font-bold text-base sm:text-lg text-white truncate drop-shadow-md"
                title={nb.name}
              >
                {nb.name}
              </h3>
              <p className="text-[11px] text-white/75 mt-0.5">
                Opened {formatRelativeDate(nb.updated_at)}
              </p>
            </div>
          </>
        ) : (
          <div className={`absolute inset-0 ${color.bg} ${color.border} border`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
            <div className="relative h-full p-3 sm:p-4 flex flex-col justify-between">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-lg sm:text-xl shadow-sm">
                {emojiFor(nb)}
              </div>
              <div>
                <h3
                  className={`font-semibold text-xs sm:text-sm ${color.text} mb-0.5 sm:mb-1 truncate`}
                  title={nb.name}
                >
                  {nb.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-stone-500">
                  Opened {formatRelativeDate(nb.updated_at)}
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.button>
    </CardSpotlight>
  );
}

function GridCard({
  nb,
  onOpen,
  onDelete,
  onRegenerateEmoji,
  onMove,
  isRegenerating,
  emojiFor,
}: {
  nb: Notebook;
  onOpen: (id: string) => void;
  onDelete: (nb: Notebook, e: React.MouseEvent) => void;
  onRegenerateEmoji?: (nb: Notebook, e: React.MouseEvent) => void;
  onMove?: (nb: Notebook, e: React.MouseEvent) => void;
  isRegenerating: boolean;
  emojiFor: (nb: Notebook) => string;
}) {
  const color = colorFor(nb.name);
  const { hasCover, coverUrl, onError } = useCoverFallback(nb.cover_image_url);

  return (
    <CardSpotlight className="rounded-lg sm:rounded-xl">
      <motion.div
        variants={cardItem}
        onClick={() => onOpen(nb.id)}
        className="group relative h-full aspect-[4/3] sm:aspect-[16/11] rounded-lg sm:rounded-xl border border-stone-200 overflow-hidden cursor-pointer hover:border-accent-300 hover:shadow-lg hover:-translate-y-0.5 transition-all"
      >
        {hasCover ? (
          <>
            <img
              src={coverUrl!}
              alt=""
              onError={onError}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/35 to-transparent" />
            <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-base shadow-sm">
              {emojiFor(nb)}
            </div>
            <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4">
              <h3
                className="font-semibold text-xs sm:text-base text-white truncate drop-shadow-md pr-12 sm:pr-16"
                title={nb.name}
              >
                {nb.name}
              </h3>
              <p className="text-[10px] sm:text-xs text-white/70 mt-0.5 sm:mt-1">
                {formatRelativeDate(nb.updated_at)}
              </p>
              {nb.message_count !== undefined && nb.message_count > 0 && (
                <p className="hidden sm:block text-xs text-white/70 mt-1">
                  💬 {nb.message_count}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className={`absolute inset-0 ${color.bg} border border-transparent`}>
            <div className="absolute inset-0 bg-gradient-to-br from-accent-50/0 via-transparent to-accent-50/0 group-hover:from-accent-50/60 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
            <div className="relative h-full p-3 sm:p-5 flex flex-col">
              <div
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full ${color.accent} flex items-center justify-center text-white text-base sm:text-lg shadow-sm mb-2 sm:mb-3`}
              >
                {emojiFor(nb)}
              </div>
              <h3
                className="font-semibold text-xs sm:text-base text-stone-900 truncate pr-12 sm:pr-16"
                title={nb.name}
              >
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
            </div>
          </div>
        )}

        <motion.div
          variants={actionStagger}
          initial="hidden"
          whileHover="visible"
          className="absolute top-0 right-0 flex items-center gap-1
                     opacity-100
                     [@media(hover:hover)]:opacity-0
                     [@media(hover:hover)]:group-hover:opacity-100
                     transition z-10"
        >
          {onMove && (
            <motion.button
              variants={actionChild}
              onClick={(e) => onMove(nb, e)}
              className={
                hasCover
                  ? 'p-1.5 text-white/70 hover:text-white disabled:opacity-40 rounded-lg hover:bg-white/15 transition'
                  : 'p-1.5 text-stone-400 hover:text-accent-600 disabled:opacity-40 rounded-lg hover:bg-white transition'
              }
              title="Move to folder"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
              </svg>
            </motion.button>
          )}
          {onRegenerateEmoji && (
            <motion.button
              variants={actionChild}
              onClick={(e) => onRegenerateEmoji(nb, e)}
              disabled={isRegenerating}
              className={
                hasCover
                  ? 'p-1.5 text-white/70 hover:text-white disabled:opacity-40 rounded-lg hover:bg-white/15 transition'
                  : 'p-1.5 text-stone-400 hover:text-accent-600 disabled:opacity-40 rounded-lg hover:bg-white transition'
              }
              title="Regenerate emoji"
            >
              {isRegenerating ? '⏳' : '🎲'}
            </motion.button>
          )}
          <motion.button
            variants={actionChild}
            onClick={(e) => onDelete(nb, e)}
            className={
              hasCover
                ? 'p-1.5 text-white/70 hover:text-white disabled:opacity-40 rounded-lg hover:bg-white/15 transition'
                : 'p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-white transition'
            }
            title="Delete notebook"
          >
            🗑️
          </motion.button>
        </motion.div>
      </motion.div>
    </CardSpotlight>
  );
}