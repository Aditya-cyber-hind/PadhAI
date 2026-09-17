'use client';

import { useState } from 'react';
import SourcePanel from '@/components/SourcePanel';
import ChatPanel from '@/components/ChatPanel';

export default function PadhAI() {
  const [sources, setSources] = useState<string>('');

  return (
    <main className="flex h-screen overflow-hidden">
      <SourcePanel sources={sources} setSources={setSources} />
      <ChatPanel sources={sources} />
    </main>
  );
} 
