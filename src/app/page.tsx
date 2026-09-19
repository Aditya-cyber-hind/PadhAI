'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth/client';
import SourcePanel, { UploadedFile } from '@/components/SourcePanel';
import FeatureTabs from '@/components/FeatureTabs';

const FILES_KEY = 'padh-ai-files-meta';
const PASTED_KEY = 'padh-ai-pasted';

export default function PadhAI() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? '';

  const [pastedText, setPastedText] = useState<string>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem(FILES_KEY);
      if (savedFiles) {
        const parsed = JSON.parse(savedFiles);
        if (Array.isArray(parsed)) {
          // Text is NOT stored — restore with empty text
          setFiles(
            parsed.map((f: UploadedFile) => ({ ...f, text: '' }))
          );
        }
      }
      const savedPasted = sessionStorage.getItem(PASTED_KEY);
      if (savedPasted) setPastedText(savedPasted);
    } catch (err) {
      console.error('[storage] failed to load:', err);
    }
    setHydrated(true);
  }, []);

  // Save files metadata (no text) to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      const metadata = files.map(({ text, ...rest }) => rest);
      localStorage.setItem(FILES_KEY, JSON.stringify(metadata));
    } catch (err) {
      console.error('[storage] failed to save files:', err);
    }
  }, [files, hydrated]);

  // Save pasted text to sessionStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (pastedText) {
        sessionStorage.setItem(PASTED_KEY, pastedText);
      } else {
        sessionStorage.removeItem(PASTED_KEY);
      }
    } catch (err) {
      console.error('[storage] failed to save pasted text:', err);
    }
  }, [pastedText, hydrated]);

const combinedSources = pastedText;
const hasSources =
  files.some((f) => f.status === 'success') || pastedText.trim().length > 0;

return (
  <main className="h-screen w-screen flex overflow-hidden">
    <SourcePanel
      pastedText={pastedText}
      setPastedText={setPastedText}
      files={files}
      setFiles={setFiles}
      userId={userId}
    />
    <FeatureTabs sources={combinedSources} userId={userId} hasSources={hasSources} />
  </main>
);
}