'use client';

import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import AmberHighlight from '@/components/AmberHighlight';

export default function HeroHeadline() {
  return (
    <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-stone-900 leading-[1.1] mb-6">
      <TextGenerateEffect
        words="Turn any document into a"
        className="inline font-display text-4xl sm:text-5xl md:text-6xl font-bold text-stone-900 leading-[1.1] !mt-0"
        duration={0.4}
        filter={true}
      />{' '}
      <AmberHighlight>study workspace</AmberHighlight>.
    </h1>
  );
}