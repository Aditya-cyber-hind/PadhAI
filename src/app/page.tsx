'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth/client';
import Dashboard, { Notebook } from '@/components/Dashboard';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import SourcePanel, { UploadedFile } from '@/components/SourcePanel';
import FeatureTabs from '@/components/FeatureTabs';
import MobileTabs from '@/components/MobileTabs';

const FILES_KEY = 'padh-ai-files-meta';
const MAX_NOTEBOOKS = 15;

export default function PadhAI() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetch('/api/warmup').catch(() => {});
  }, []);

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

  // Load pasted text when a notebook opens
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

  // Load file metadata from localStorage
  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem(FILES_KEY);
      if (savedFiles) {
        const parsed = JSON.parse(savedFiles);
        if (Array.isArray(parsed)) {
          setFiles(parsed.map((f: UploadedFile) => ({ ...f, text: '' })));
        }
      }
    } catch (err) {
      console.error('[storage] load failed:', err);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const metadata = files.map(({ text, ...rest }) => rest);
      localStorage.setItem(FILES_KEY, JSON.stringify(metadata));
    } catch (err) {
      console.error('[storage] save files failed:', err);
    }
  }, [files, hydrated]);

  const handleCreate = async (name: string) => {
    const res = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to create notebook');
      return;
    }
    setNotebooks((prev) => [data.notebook, ...prev]);
    setActiveId(data.notebook.id);
    setFiles([]);
    setPastedText('');
  };

  const handleOpen = (id: string) => {
    setActiveId(id);
    setFiles([]);
    setPastedText('');
  };

  const handleBack = () => {
    setActiveId('');
    setFiles([]);
    setPastedText('');
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

  if (isPending || isMobile === null) {
    return (
      <main className="app-viewport w-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-400 text-sm">Loading...</p>
      </main>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/landing';
    }
    return (
      <main className="app-viewport w-screen flex items-center justify-center bg-stone-50">
        <p className="text-stone-400 text-sm">Redirecting...</p>
      </main>
    );
  }

  const userName = user.name || user.email || 'there';
  const userEmail = user.email || '';
  const userImage = user.image || undefined;

  if (!activeId) {
    return (
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
    );
  }

  const activeNotebook = notebooks.find((n) => n.id === activeId);
  const combinedSources = pastedText;
  const hasSources =
    files.some((f) => f.status === 'success') || pastedText.trim().length > 0;
  const sourceNames = files
    .filter((f) => f.status === 'success')
    .map((f) => f.name);

  return (
    <main className="app-viewport w-screen flex flex-col">
      <WorkspaceHeader
        notebookName={activeNotebook?.name || 'Notebook'}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        onBack={handleBack}
        onRename={handleRename}
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
          />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <SourcePanel
            pastedText={pastedText}
            setPastedText={setPastedText}
            files={files}
            setFiles={setFiles}
            notebookId={activeId}
          />
          <FeatureTabs
            sources={combinedSources}
            notebookId={activeId}
            hasSources={hasSources}
            sourceNames={sourceNames}
          />
        </div>
      )}
    </main>
  );
}