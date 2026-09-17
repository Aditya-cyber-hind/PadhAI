'use client';

import { useState } from 'react';
import SourcePanel from '@/components/SourcePanel';
import FeatureTabs from '@/components/FeatureTabs';

export default function PadhAI() {
  const [sources, setSources] = useState<string>('');

  return (
    <main className="h-screen w-screen flex overflow-hidden">
      <SourcePanel sources={sources} setSources={setSources} />
      <FeatureTabs sources={sources} />
    </main>
  );
}