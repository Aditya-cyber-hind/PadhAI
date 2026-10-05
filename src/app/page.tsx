'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { authClient } from '@/lib/auth/client';
import Dashboard, { Notebook } from '@/components/Dashboard';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import SourcePanel, { UploadedFile } from '@/components/SourcePanel';
import FeatureTabs, { FeatureTab } from '@/components/FeatureTabs';
import MobileTabs from '@/components/MobileTabs';
import { CitationProvider } from '@/components/CitationContext';
import CitationDrawer from '@/components/CitationDrawer';
import LoadingScreen from '@/components/LoadingScreen';
import RedirectingScreen from '@/components/RedirectingScreen';
import { ToastProvider, useToast } from '@/components/Toast';
import {
  WorkspaceActionsProvider,
  WorkspaceActions,
  FlashcardInput,
} from '@/components/WorkspaceActionsContext';
import OnboardingModal from '@/components/OnboardingModal';

const MAX_NOTEBOOKS = 15;
const SOURCES_COLLAPSED_KEY = 'padhai:sources-collapsed';
const SOURCES_WIDTH_KEY = 'padhai:sources-width';

const DEFAULT_SOURCES_WIDTH = 380; // px
const MIN_SOURCES_WIDTH = 240;
const MIN_CHAT_WIDTH = 500; // right side never goes below this

/**
 * Dynamic max: Sources can grow until Chat is down to MIN_CHAT_WIDTH.
 * Prevents the chat panel from being squeezed into an unreadable strip.
 */
function getMaxSourcesWidth(): number {
  if (typeof window === 'undefined') return 720;
  const vw = window.innerWidth;
  const max = vw - MIN_CHAT_WIDTH - 1;
  return Math.max(MIN_SOURCES_WIDTH + 50, max);
}

function clampWidth(w: number): number {
  const max = getMaxSourcesWidth();
  return Math.max(MIN_SOURCES_WIDTH, Math.min(max, w));
}

function PadhAIInner() {
  const { pushToast } = useToast();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [sourcesWidth, setSourcesWidth] = useState(DEFAULT_SOURCES_WIDTH);
  const [isDragging, setIsDragging] = useState(false);

  const [activeTab, setActiveTab] = useState<FeatureTab>('chat');
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const dragStartRef = useRef<{ startX: number; startWidth: number } | null>(null);

  /* ── Hydrate persisted prefs ──────────────────────────── */
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem(SOURCES_COLLAPSED_KEY);
      if (savedCollapsed === 'true') setSourcesCollapsed(true);

      const savedWidth = localStorage.getItem(SOURCES_WIDTH_KEY);
      if (savedWidth) {
        const n = parseInt(savedWidth, 10);
        if (!isNaN(n)) setSourcesWidth(clampWidth(n));
      }
    } catch {}
  }, []);

  /* ── Re-clamp width on window resize ──────────────────── */
  useEffect(() => {
    const onResize = () => {
      setSourcesWidth((current) => clampWidth(current));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleSources = useCallback(() => {
    setSourcesCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOURCES_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  /* ── Drag-to-resize ───────────────────────────────────── */
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (sourcesCollapsed) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dragStartRef.current = {
        startX: clientX,
        startWidth: sourcesWidth,
      };
      setIsDragging(true);
    },
    [sourcesCollapsed, sourcesWidth]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const delta = clientX - start.startX;
      const next = clampWidth(start.startWidth + delta);
      setSourcesWidth(next);
    };

    const onUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      setSourcesWidth((current) => {
        try {
          localStorage.setItem(SOURCES_WIDTH_KEY, String(current));
        } catch {}
        return current;
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging]);

  /* ── Prevent text selection while dragging ────────────── */
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  /* ── Mobile detection ─────────────────────────────────── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetch('/api/warmup').catch(() => {});
  }, []);

  /* ── Onboarding status check ──────────────────────────── */
  useEffect(() => {
    if (!user?.id || onboardingChecked) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/onboarding');
        if (!res.ok) {
          if (!cancelled) setOnboardingChecked(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setShowOnboarding(!data.seen);
        setOnboardingChecked(true);
      } catch {
        if (!cancelled) setOnboardingChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, onboardingChecked]);

  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false);
    try {
      await fetch('/api/onboarding', { method: 'POST' });
    } catch (err) {
      console.error('[onboarding] mark failed:', err);
    }
  }, []);

  /* ── Notebooks load ───────────────────────────────────── */
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res = await fetch('/api/notebooks');
        const data = await res.json();
        if (res.ok && Array.isArray(data.notebooks)) setNotebooks(data.notebooks);
      } catch (err) {
        console.error('[notebooks] load failed:', err);
      }
    })();
  }, [user?.id]);

  /* ── Pasted text load ─────────────────────────────────── */
  useEffect(() => {
    if (!activeId) {
      setPastedText('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/notebooks/${activeId}/pasted-text`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPastedText(data.pasted_text ?? '');
      } catch (err) {
        console.error('[pasted-text] load failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const handleCreate = async (name: string, notebookType: 'study' | 'coding' = 'study') => {
    const res = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, notebookType }),
    });
    const data = await res.json();
    if (!res.ok) {
      pushToast('error', data.error || 'Failed to create notebook');
      return;
    }
    setNotebooks((prev) => [data.notebook, ...prev]);
    setActiveId(data.notebook.id);
    setFiles([]);
    setPastedText('');
    setActiveTab(notebookType === 'coding' ? 'coder' : 'chat');
  };

  const handleOpen = (id: string) => {
    setActiveId(id);
    setFiles([]);
    setPastedText('');
    setPendingChatMessage(null);
  };

  const handleBack = () => {
    setActiveId('');
    setFiles([]);
    setPastedText('');
    setPendingChatMessage(null);
  };

  const handleRename = async (name: string) => {
    if (!activeId) return;
    const res = await fetch(`/api/notebooks/${activeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setNotebooks((prev) =>
        prev.map((n) => (n.id === activeId ? { ...n, name } : n))
      );
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/notebooks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setNotebooks((prev) => prev.filter((n) => n.id !== id));
      if (activeId === id) setActiveId('');
    }
  };

  const handleRegenerateEmoji = async (id: string) => {
    try {
      const res = await fetch('/api/notebooks/emoji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookId: id }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.emoji) {
        setNotebooks((prev) =>
          prev.map((n) => (n.id === id ? { ...n, emoji: data.emoji } : n))
        );
      }
    } catch (err) {
      console.error('[regenerate emoji]', err);
    }
  };

  const askAbout = useCallback((question: string) => {
    setPendingChatMessage(question);
    setActiveTab('chat');
  }, []);

  const addFlashcard = useCallback(
    async (card: FlashcardInput): Promise<boolean> => {
      if (!activeId) return false;
      try {
        const res = await fetch('/api/flashcards/single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notebookId: activeId,
            term: card.term,
            definition: card.definition,
            category: card.category,
            difficulty: card.difficulty,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          pushToast('error', data.error || 'Failed to add flashcard');
          return false;
        }
        pushToast('success', 'Flashcard added to your deck');
        return true;
      } catch (err) {
        console.error('[addFlashcard]', err);
        pushToast('error', 'Failed to add flashcard');
        return false;
      }
    },
    [activeId, pushToast]
  );

  const actions: WorkspaceActions = useMemo(
    () => ({ askAbout, addFlashcard }),
    [askAbout, addFlashcard]
  );

  if (isPending || isMobile === null) {
    return <LoadingScreen />;
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/landing';
    }
    return <RedirectingScreen />;
  }

  const userName = user.name || user.email || 'there';
  const userEmail = user.email || '';
  const userImage = user.image || undefined;

  if (!activeId) {
    return (
      <>
        <Dashboard
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          notebooks={notebooks}
          onOpen={handleOpen}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onRegenerateEmoji={handleRegenerateEmoji}
          maxNotebooks={MAX_NOTEBOOKS}
        />
        {onboardingChecked && (
          <OnboardingModal
            open={showOnboarding}
            onComplete={handleOnboardingComplete}
          />
        )}
      </>
    );
  }

  const activeNotebook = notebooks.find((n) => n.id === activeId);
  const notebookName = activeNotebook?.name || 'Notebook';
  const notebookType = activeNotebook?.notebook_type || 'study';
  const combinedSources = pastedText;
  const hasSources =
    files.some((f) => f.status === 'success') || pastedText.trim().length > 0;
  const sourceNames = files
    .filter((f) => f.status === 'success')
    .map((f) => f.name);

  return (
    <CitationProvider>
      <WorkspaceActionsProvider value={actions}>
        <main className="app-viewport w-screen flex flex-col">
          <WorkspaceHeader
            notebookId={activeId}
            notebookName={notebookName}
            customInstructions={activeNotebook?.custom_instructions ?? null}
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
            onBack={handleBack}
            onRename={handleRename}
            onSettingsSaved={(updates) => {
              setNotebooks((prev) =>
                prev.map((n) =>
                  n.id === activeId ? { ...n, ...updates } : n
                )
              );
            }}
            sourcesCollapsed={sourcesCollapsed}
            onToggleSources={isMobile ? undefined : toggleSources}
          />

          {isMobile ? (
            <div className="flex-1 min-h-0">
              <MobileTabs
                pastedText={pastedText}
                setPastedText={setPastedText}
                files={files}
                setFiles={setFiles}
                notebookId={activeId}
                combinedSources={combinedSources}
                hasSources={hasSources}
                sourceNames={sourceNames}
                notebookName={notebookName}
                notebookType={notebookType}
                pendingChatMessage={pendingChatMessage}
                onPendingChatMessageConsumed={() => setPendingChatMessage(null)}
              />
            </div>
          ) : (
            <div className="flex-1 flex min-h-0">
              {/* Sources panel — animated width */}
              <motion.div
                initial={false}
                animate={{ width: sourcesCollapsed ? 0 : sourcesWidth }}
                transition={
                  isDragging
                    ? { duration: 0 }
                    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
                }
                className="h-full flex-shrink-0 overflow-hidden"
                style={{ minWidth: 0 }}
              >
                <SourcePanel
                  pastedText={pastedText}
                  setPastedText={setPastedText}
                  files={files}
                  setFiles={setFiles}
                  notebookId={activeId}
                />
              </motion.div>

              {/* Drag handle */}
              {!sourcesCollapsed && (
                <div
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                  onDoubleClick={toggleSources}
                  className={`relative flex-shrink-0 w-1 cursor-col-resize transition-colors ${
                    isDragging
                      ? 'bg-accent-400'
                      : 'bg-stone-200 hover:bg-accent-300'
                  }`}
                  title="Drag to resize · Double-click to collapse"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize sources panel"
                >
                  <div className="absolute inset-y-0 -left-1 -right-1" />
                </div>
              )}

              <div className="flex-1 min-w-0 h-full">
                <FeatureTabs
                  sources={combinedSources}
                  notebookId={activeId}
                  hasSources={hasSources}
                  sourceNames={sourceNames}
                  notebookName={notebookName}
                  notebookType={notebookType}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  pendingChatMessage={pendingChatMessage}
                  onPendingChatMessageConsumed={() => setPendingChatMessage(null)}
                />
              </div>
            </div>
          )}

          <CitationDrawer />

          {onboardingChecked && (
            <OnboardingModal
              open={showOnboarding}
              onComplete={handleOnboardingComplete}
            />
          )}
        </main>
      </WorkspaceActionsProvider>
    </CitationProvider>
  );
}

export default function PadhAI() {
  return (
    <ToastProvider>
      <PadhAIInner />
    </ToastProvider>
  );
}