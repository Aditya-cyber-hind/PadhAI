'use client';

import { useState } from 'react';
import SourcePanel, { UploadedFile } from '@/components/SourcePanel';
import FeatureTabs from '@/components/FeatureTabs';

export default function PadhAI() {
  const [pastedText, setPastedText] = useState<string>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // Combine pasted text + all successful file extractions
  const combinedSources = [
    ...files
      .filter((f) => f.status === 'success' && f.text)
      .map((f) => `--- ${f.name} ---\n${f.text}`),
    pastedText,
  ]
    .filter(Boolean)
    .join('\n\n');

  return (
    <main className="h-screen w-screen flex overflow-hidden">
      <SourcePanel
        pastedText={pastedText}
        setPastedText={setPastedText}
        files={files}
        setFiles={setFiles}
      />
      <FeatureTabs sources={combinedSources} />
    </main>
  );
}