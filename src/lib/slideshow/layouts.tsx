'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import type { ThemeId } from './themes';

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

export type SlideType = 'section' | 'bullets' | 'statement' | 'takeaway';

export type BulletsLayout = 'list' | 'two-column' | 'icon-grid' | 'flow';
export type SectionLayout = 'number-hero' | 'split' | 'badge';
export type StatementLayout = 'hero' | 'left' | 'underlined';
export type TakeawayLayout = 'numbered' | 'checklist' | 'icons';

export type SlideLayout =
  | BulletsLayout
  | SectionLayout
  | StatementLayout
  | TakeawayLayout;

export interface SlideData {
  type: SlideType;
  layout?: string;
  heading: string;
  bullets: string[];
  statement: string;
  sectionNumber: string;
  sectionLabel: string;
  takeaways: string[];
  math?: string;
  notes: string;
}

/* ─────────────────────────────────────────────────────────────
   Fallback rules — if the LLM picks a layout that won't fit the
   content, we silently switch to a safe one. User never sees this.
   ───────────────────────────────────────────────────────────── */

export function sanitizeLayout(slide: SlideData): SlideData {
  const safe = { ...slide };
  const bullets = Array.isArray(safe.bullets) ? safe.bullets : [];

  if (safe.type === 'bullets') {
    const wordCounts = bullets.map((b) => b.trim().split(/\s+/).length);
    const maxWords = Math.max(0, ...wordCounts);
    const itemCount = bullets.length;

    // Default if nothing fits
    let layout: BulletsLayout = (safe.layout as BulletsLayout) || 'list';
    const valid: BulletsLayout[] = ['list', 'two-column', 'icon-grid', 'flow'];
    if (!valid.includes(layout)) layout = 'list';

    // icon-grid needs 3-6 short items
    if (layout === 'icon-grid' && (itemCount < 3 || itemCount > 6 || maxWords > 9)) {
      layout = itemCount >= 4 && maxWords <= 20 ? 'two-column' : 'list';
    }

    // flow needs 3-4 items, ideally sequential
    if (layout === 'flow' && (itemCount < 3 || itemCount > 4)) {
      layout = itemCount >= 4 ? 'two-column' : 'list';
    }

    // two-column needs 4-6 items
    if (layout === 'two-column' && (itemCount < 4 || itemCount > 6)) {
      layout = 'list';
    }

    // list shouldn't be used for very short punchy items if we have 4+
    // (doesn't force change; LLM's pick wins here)

    safe.layout = layout;
  }

  if (safe.type === 'section') {
    const valid: SectionLayout[] = ['number-hero', 'split', 'badge'];
    if (!valid.includes(safe.layout as SectionLayout)) {
      safe.layout = 'number-hero';
    }
  }

  if (safe.type === 'statement') {
    const valid: StatementLayout[] = ['hero', 'left', 'underlined'];
    if (!valid.includes(safe.layout as StatementLayout)) {
      safe.layout = 'hero';
    }
    // "underlined" wants a short statement (<14 words)
    if (safe.layout === 'underlined') {
      const words = (safe.statement || '').trim().split(/\s+/).length;
      if (words > 14) safe.layout = 'hero';
    }
  }

  if (safe.type === 'takeaway') {
    const valid: TakeawayLayout[] = ['numbered', 'checklist', 'icons'];
    if (!valid.includes(safe.layout as TakeawayLayout)) {
      safe.layout = 'numbered';
    }
    const t = Array.isArray(safe.takeaways) ? safe.takeaways : [];
    const maxWords = Math.max(0, ...t.map((x) => x.trim().split(/\s+/).length));
    // icons wants very short items
    if (safe.layout === 'icons' && (t.length < 2 || t.length > 4 || maxWords > 8)) {
      safe.layout = 'numbered';
    }
  }

  return safe;
}

/* ─────────────────────────────────────────────────────────────
   Math block — reused in bullets layouts
   ───────────────────────────────────────────────────────────── */

function MathBlock({
  math,
  themeId,
}: {
  math?: string;
  themeId: ThemeId;
}) {
  if (!math || math.trim() === '') return null;

  const isDark = themeId === 'bold';
  return (
    <div
      className={`mt-8 sm:mt-10 text-2xl sm:text-3xl text-center max-w-none ${
        isDark
          ? 'text-stone-100 prose prose-invert prose-2xl'
          : 'prose prose-stone prose-2xl'
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
      >
        {math.replace(/\u202F/g, ' ')}
      </ReactMarkdown>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   BULLETS — 4 layouts × 3 themes = 12 components
   ═════════════════════════════════════════════════════════════ */

/* ── BULLETS · LIST ─────────────────────────────────────────── */

function BulletsListEditorial({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-8 sm:mb-10 leading-tight text-stone-900">
        {slide.heading}
      </h2>
      <ul className="space-y-4 sm:space-y-5">
        {slide.bullets.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-4 text-lg sm:text-xl md:text-2xl text-stone-800 leading-snug"
          >
            <span className="mt-2 sm:mt-3 flex-shrink-0 w-6 h-0.5 bg-amber-600 rounded-full" />
            <span className="flex-1">{b}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function BulletsListBold({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-8 sm:mb-10 leading-tight">
        {slide.heading}
      </h2>
      <ul className="space-y-4 sm:space-y-5">
        {slide.bullets.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-4 text-lg sm:text-xl md:text-2xl text-stone-200 leading-snug"
          >
            <span className="mt-2 sm:mt-3 flex-shrink-0 w-6 h-0.5 bg-gradient-to-r from-accent-400 to-orange-400 rounded-full" />
            <span className="flex-1">{b}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function BulletsListNotion({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 leading-tight text-stone-900">
        {slide.heading}
      </h2>
      <ul className="space-y-3 sm:space-y-4">
        {slide.bullets.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-lg sm:text-xl text-stone-700 leading-relaxed"
          >
            <span className="mt-2.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-stone-400" />
            <span className="flex-1">{b}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ── BULLETS · TWO-COLUMN ───────────────────────────────────── */

function BulletsTwoColumnEditorial({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-3xl sm:text-4xl font-bold mb-8 leading-tight text-stone-900">
        {slide.heading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {slide.bullets.map((b, i) => (
          <div
            key={i}
            className="flex items-start gap-3 text-base sm:text-lg md:text-xl text-stone-800 leading-snug"
          >
            <span className="mt-2 flex-shrink-0 w-5 h-0.5 bg-amber-600 rounded-full" />
            <span className="flex-1">{b}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function BulletsTwoColumnBold({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-3xl sm:text-4xl font-bold mb-8 leading-tight">
        {slide.heading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {slide.bullets.map((b, i) => (
          <div
            key={i}
            className="flex items-start gap-3 text-base sm:text-lg md:text-xl text-stone-200 leading-snug"
          >
            <span className="mt-2 flex-shrink-0 w-5 h-0.5 bg-gradient-to-r from-accent-400 to-orange-400 rounded-full" />
            <span className="flex-1">{b}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function BulletsTwoColumnNotion({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6 leading-tight text-stone-900">
        {slide.heading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slide.bullets.map((b, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-sm sm:text-base text-stone-700 leading-snug"
          >
            {b}
          </div>
        ))}
      </div>
    </>
  );
}

/* ── BULLETS · ICON-GRID ────────────────────────────────────── */

const GRID_EMOJIS = ['✨', '⚡', '🎯', '💡', '🔑', '📌', '⭐', '🧩'];

function BulletsIconGridEditorial({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-3xl sm:text-4xl font-bold mb-8 leading-tight text-stone-900">
        {slide.heading}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
        {slide.bullets.map((b, i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-xl bg-white/70 border border-stone-200 flex flex-col gap-2"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-lg">
              {GRID_EMOJIS[i % GRID_EMOJIS.length]}
            </div>
            <p className="text-sm sm:text-base text-stone-800 leading-snug font-medium">
              {b}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function BulletsIconGridBold({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-3xl sm:text-4xl font-bold mb-8 leading-tight">
        {slide.heading}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
        {slide.bullets.map((b, i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col gap-2"
          >
            <div className="w-9 h-9 rounded-lg bg-accent-500/20 border border-accent-500/40 flex items-center justify-center text-lg">
              {GRID_EMOJIS[i % GRID_EMOJIS.length]}
            </div>
            <p className="text-sm sm:text-base text-stone-100 leading-snug font-medium">
              {b}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function BulletsIconGridNotion({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6 leading-tight text-stone-900">
        {slide.heading}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {slide.bullets.map((b, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border border-stone-200 bg-white flex flex-col gap-2"
          >
            <div className="w-8 h-8 rounded-md bg-stone-100 flex items-center justify-center text-base">
              {GRID_EMOJIS[i % GRID_EMOJIS.length]}
            </div>
            <p className="text-sm text-stone-700 leading-snug">{b}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── BULLETS · FLOW ─────────────────────────────────────────── */

function BulletsFlowEditorial({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-3xl sm:text-4xl font-bold mb-8 leading-tight text-stone-900">
        {slide.heading}
      </h2>
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        {slide.bullets.map((b, i) => (
          <React.Fragment key={i}>
            <div className="flex-1 p-4 rounded-xl bg-white/70 border border-stone-200 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <p className="text-sm sm:text-base text-stone-800 leading-snug">
                {b}
              </p>
            </div>
            {i < slide.bullets.length - 1 && (
              <div className="flex items-center justify-center text-amber-600 text-xl sm:self-center">
                →
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

function BulletsFlowBold({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-3xl sm:text-4xl font-bold mb-8 leading-tight">
        {slide.heading}
      </h2>
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        {slide.bullets.map((b, i) => (
          <React.Fragment key={i}>
            <div className="flex-1 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-orange-500 text-white flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <p className="text-sm sm:text-base text-stone-100 leading-snug">
                {b}
              </p>
            </div>
            {i < slide.bullets.length - 1 && (
              <div className="flex items-center justify-center text-accent-400 text-xl sm:self-center">
                →
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

function BulletsFlowNotion({ slide }: { slide: SlideData }) {
  return (
    <>
      <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6 leading-tight text-stone-900">
        {slide.heading}
      </h2>
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        {slide.bullets.map((b, i) => (
          <React.Fragment key={i}>
            <div className="flex-1 p-4 rounded-lg border border-stone-200 bg-stone-50 flex flex-col gap-2">
              <div className="w-7 h-7 rounded-md bg-stone-800 text-white flex items-center justify-center text-xs font-bold">
                {i + 1}
              </div>
              <p className="text-sm text-stone-700 leading-snug">{b}</p>
            </div>
            {i < slide.bullets.length - 1 && (
              <div className="flex items-center justify-center text-stone-400 text-lg sm:self-center">
                →
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION — 3 layouts × 3 themes = 9 components
   ═════════════════════════════════════════════════════════════ */

/* ── SECTION · NUMBER-HERO ──────────────────────────────────── */

function SectionNumberHeroEditorial({ slide }: { slide: SlideData }) {
  const label = slide.sectionLabel || slide.heading;
  const num = slide.sectionNumber || '01';
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12">
      <div
        className="font-display text-7xl sm:text-9xl font-black leading-none text-emerald-700"
        style={{ letterSpacing: '-0.04em' }}
      >
        {num}
      </div>
      <div className="flex-1">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-emerald-700 font-semibold mb-3">
          Section
        </p>
        <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold leading-tight text-stone-900">
          {label}
        </h2>
      </div>
    </div>
  );
}

function SectionNumberHeroBold({ slide }: { slide: SlideData }) {
  const label = slide.sectionLabel || slide.heading;
  const num = slide.sectionNumber || '01';
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12">
      <div className="font-display text-7xl sm:text-9xl font-black leading-none bg-gradient-to-br from-emerald-300 to-cyan-500 bg-clip-text text-transparent">
        {num}
      </div>
      <div className="flex-1">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-emerald-400 font-semibold mb-3">
          Section
        </p>
        <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold leading-tight">
          {label}
        </h2>
      </div>
    </div>
  );
}

function SectionNumberHeroNotion({ slide }: { slide: SlideData }) {
  const label = slide.sectionLabel || slide.heading;
  const num = slide.sectionNumber || '01';
  return (
    <div className="flex flex-col items-start gap-4">
      <span className="text-6xl sm:text-7xl font-black text-stone-300 leading-none">
        {num}
      </span>
      <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight text-stone-900">
        {label}
      </h2>
    </div>
  );
}

/* ── SECTION · SPLIT ────────────────────────────────────────── */

function SectionSplitEditorial({ slide }: { slide: SlideData }) {
  const label = slide.sectionLabel || slide.heading;
  const num = slide.sectionNumber || '01';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
      <div
        className="font-display text-8xl sm:text-9xl font-black leading-none text-emerald-700"
        style={{ letterSpacing: '-0.04em' }}
      >
        {num}
      </div>
      <div>
        <div className="w-12 h-1 bg-emerald-700 rounded-full mb-4" />
        <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight text-stone-900">
          {label}
        </h2>
      </div>
    </div>
  );
}

function SectionSplitBold({ slide }: { slide: SlideData }) {
  const label = slide.sectionLabel || slide.heading;
  const num = slide.sectionNumber || '01';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
      <div className="font-display text-8xl sm:text-9xl font-black leading-none bg-gradient-to-br from-emerald-300 to-cyan-500 bg-clip-text text-transparent">
        {num}
      </div>
      <div>
        <div className="w-12 h-1 bg-emerald-400 rounded-full mb-4" />
        <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight">
          {label}
        </h2>
      </div>
    </div>
  );
}

function SectionSplitNotion({ slide }: { slide: SlideData }) {
  const label = slide.sectionLabel || slide.heading;
  const num = slide.sectionNumber || '01';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
      <div className="text-8xl sm:text-9xl font-black leading-none text-stone-200">
        {num}
      </div>
      <div>
        <div className="w-12 h-1 bg-stone-800 rounded-full mb-4" />
        <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight text-stone-900">
          {label}
        </h2>
      </div>
    </div>
  );
}

/* ── SECTION · BADGE ────────────────────────────────────────── */

function SectionBadgeEditorial({ slide }: { slide: SlideData }) {
  const label = slide.sectionLabel || slide.heading;
  const num = slide.sectionNumber || '01';
  return (
    <div className="text-center max-w-3xl mx-auto">
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-sm font-semibold mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-600" />
        Section {num}
      </span>
      <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold leading-tight text-stone-900">
        {label}
      </h2>
    </div>
  );
}

function SectionBadgeBold({ slide }: { slide: SlideData }) {
  const label = slide.sectionLabel || slide.heading;
  const num = slide.sectionNumber || '01';
  return (
    <div className="text-center max-w-3xl mx-auto">
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-semibold mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        Section {num}
      </span>
      <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold leading-tight">
        {label}
      </h2>
    </div>
  );
}

function SectionBadgeNotion({ slide }: { slide: SlideData }) {
  const label = slide.sectionLabel || slide.heading;
  const num = slide.sectionNumber || '01';
  return (
    <div className="max-w-3xl">
      <span className="inline-block px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium mb-4">
        Section {num}
      </span>
      <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight text-stone-900">
        {label}
      </h2>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   STATEMENT — 3 layouts × 3 themes = 9 components
   ═════════════════════════════════════════════════════════════ */

/* ── STATEMENT · HERO ───────────────────────────────────────── */

function StatementHeroEditorial({ slide }: { slide: SlideData }) {
  return (
    <div className="text-center max-w-4xl mx-auto">
      <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-rose-700 font-semibold mb-6">
        {slide.heading}
      </p>
      <p className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-stone-900">
        {slide.statement}
      </p>
    </div>
  );
}

function StatementHeroBold({ slide }: { slide: SlideData }) {
  return (
    <div className="text-center">
      <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-accent-400 font-semibold mb-6">
        {slide.heading}
      </p>
      <p className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight max-w-4xl mx-auto">
        {slide.statement}
      </p>
    </div>
  );
}

function StatementHeroNotion({ slide }: { slide: SlideData }) {
  return (
    <div className="text-center max-w-4xl mx-auto">
      <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-6">
        {slide.heading}
      </p>
      <p className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-stone-900">
        {slide.statement}
      </p>
    </div>
  );
}

/* ── STATEMENT · LEFT ───────────────────────────────────────── */

function StatementLeftEditorial({ slide }: { slide: SlideData }) {
  return (
    <div className="max-w-4xl">
      <div className="border-l-4 border-amber-600 pl-6">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-amber-700 font-semibold mb-4">
          {slide.heading}
        </p>
        <p className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-stone-900">
          {slide.statement}
        </p>
      </div>
    </div>
  );
}

function StatementLeftBold({ slide }: { slide: SlideData }) {
  return (
    <div className="max-w-4xl">
      <div className="border-l-4 border-accent-500 pl-6">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-accent-400 font-semibold mb-4">
          {slide.heading}
        </p>
        <p className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
          {slide.statement}
        </p>
      </div>
    </div>
  );
}

function StatementLeftNotion({ slide }: { slide: SlideData }) {
  return (
    <div className="max-w-4xl">
      <div className="border-l-4 border-stone-800 pl-6">
        <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-4">
          {slide.heading}
        </p>
        <p className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-stone-900">
          {slide.statement}
        </p>
      </div>
    </div>
  );
}

/* ── STATEMENT · UNDERLINED ─────────────────────────────────── */

function StatementUnderlinedEditorial({ slide }: { slide: SlideData }) {
  return (
    <div className="max-w-4xl">
      <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-rose-700 font-semibold mb-4">
        {slide.heading}
      </p>
      <p className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-stone-900 inline-block relative">
        {slide.statement}
        <span className="absolute left-0 right-0 -bottom-2 h-1 bg-rose-500 rounded-full" />
      </p>
    </div>
  );
}

function StatementUnderlinedBold({ slide }: { slide: SlideData }) {
  return (
    <div className="max-w-4xl">
      <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-rose-300 font-semibold mb-4">
        {slide.heading}
      </p>
      <p className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight inline-block relative">
        {slide.statement}
        <span className="absolute left-0 right-0 -bottom-2 h-1 bg-gradient-to-r from-rose-400 to-accent-400 rounded-full" />
      </p>
    </div>
  );
}

function StatementUnderlinedNotion({ slide }: { slide: SlideData }) {
  return (
    <div className="max-w-4xl">
      <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-4">
        {slide.heading}
      </p>
      <p className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-stone-900 inline-block relative">
        {slide.statement}
        <span className="absolute left-0 right-0 -bottom-1.5 h-0.5 bg-stone-800" />
      </p>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TAKEAWAY — 3 layouts × 3 themes = 9 components
   ═════════════════════════════════════════════════════════════ */

/* ── TAKEAWAY · NUMBERED ────────────────────────────────────── */

function TakeawayNumberedEditorial({ slide }: { slide: SlideData }) {
  return (
    <>
      <div className="mb-8 sm:mb-10">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-amber-700 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-800">
          {slide.heading}
        </h2>
      </div>
      <ul className="space-y-5 sm:space-y-6">
        {slide.takeaways.map((t, i) => (
          <li key={i} className="flex items-start gap-4 sm:gap-5">
            <span className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-600 flex items-center justify-center text-sm sm:text-base font-bold text-white">
              {i + 1}
            </span>
            <span className="text-lg sm:text-xl md:text-2xl text-stone-800 leading-snug flex-1 pt-1 sm:pt-1.5">
              {t}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function TakeawayNumberedBold({ slide }: { slide: SlideData }) {
  return (
    <>
      <div className="mb-8 sm:mb-10">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-accent-400 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-300">
          {slide.heading}
        </h2>
      </div>
      <ul className="space-y-5 sm:space-y-6">
        {slide.takeaways.map((t, i) => (
          <li key={i} className="flex items-start gap-4 sm:gap-5">
            <span className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-accent-500 to-orange-500 flex items-center justify-center text-sm sm:text-base font-bold text-white">
              {i + 1}
            </span>
            <span className="text-lg sm:text-xl md:text-2xl text-stone-100 leading-snug flex-1 pt-1 sm:pt-1.5">
              {t}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function TakeawayNumberedNotion({ slide }: { slide: SlideData }) {
  return (
    <>
      <div className="mb-6 sm:mb-8">
        <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
          {slide.heading}
        </h2>
      </div>
      <ul className="space-y-4">
        {slide.takeaways.map((t, i) => (
          <li
            key={i}
            className="flex items-start gap-4 p-3 rounded-lg bg-stone-50 border border-stone-200"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-md bg-stone-800 flex items-center justify-center text-xs font-bold text-white">
              {i + 1}
            </span>
            <span className="text-base sm:text-lg text-stone-700 leading-snug flex-1">
              {t}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ── TAKEAWAY · CHECKLIST ───────────────────────────────────── */

function CheckRow({
  color,
  children,
}: {
  color: 'amber' | 'accent' | 'stone';
  children: React.ReactNode;
}) {
  const bg =
    color === 'amber'
      ? 'bg-amber-600'
      : color === 'accent'
      ? 'bg-gradient-to-br from-accent-500 to-orange-500'
      : 'bg-stone-800';

  return (
    <div className="flex items-start gap-4">
      <span
        className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-md ${bg} flex items-center justify-center text-white mt-0.5`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
             strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="flex-1 text-lg sm:text-xl md:text-2xl leading-snug">
        {children}
      </span>
    </div>
  );
}

function TakeawayChecklistEditorial({ slide }: { slide: SlideData }) {
  return (
    <>
      <div className="mb-8">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-amber-700 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-800">
          {slide.heading}
        </h2>
      </div>
      <div className="space-y-4 text-stone-800">
        {slide.takeaways.map((t, i) => (
          <CheckRow key={i} color="amber">
            {t}
          </CheckRow>
        ))}
      </div>
    </>
  );
}

function TakeawayChecklistBold({ slide }: { slide: SlideData }) {
  return (
    <>
      <div className="mb-8">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-accent-400 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-300">
          {slide.heading}
        </h2>
      </div>
      <div className="space-y-4 text-stone-100">
        {slide.takeaways.map((t, i) => (
          <CheckRow key={i} color="accent">
            {t}
          </CheckRow>
        ))}
      </div>
    </>
  );
}

function TakeawayChecklistNotion({ slide }: { slide: SlideData }) {
  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
          {slide.heading}
        </h2>
      </div>
      <div className="space-y-3 text-stone-700">
        {slide.takeaways.map((t, i) => (
          <CheckRow key={i} color="stone">
            {t}
          </CheckRow>
        ))}
      </div>
    </>
  );
}

/* ── TAKEAWAY · ICONS ───────────────────────────────────────── */

const TAKEAWAY_EMOJIS = ['🎯', '💡', '⭐', '🚀'];

function TakeawayIconsEditorial({ slide }: { slide: SlideData }) {
  return (
    <>
      <div className="mb-8">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-amber-700 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-800">
          {slide.heading}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {slide.takeaways.map((t, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-xl bg-white/70 border border-stone-200"
          >
            <span className="text-3xl leading-none flex-shrink-0">
              {TAKEAWAY_EMOJIS[i % TAKEAWAY_EMOJIS.length]}
            </span>
            <span className="text-base sm:text-lg text-stone-800 leading-snug">
              {t}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function TakeawayIconsBold({ slide }: { slide: SlideData }) {
  return (
    <>
      <div className="mb-8">
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-accent-400 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-300">
          {slide.heading}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {slide.takeaways.map((t, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <span className="text-3xl leading-none flex-shrink-0">
              {TAKEAWAY_EMOJIS[i % TAKEAWAY_EMOJIS.length]}
            </span>
            <span className="text-base sm:text-lg text-stone-100 leading-snug">
              {t}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function TakeawayIconsNotion({ slide }: { slide: SlideData }) {
  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-3">
          Key Takeaways
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
          {slide.heading}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slide.takeaways.map((t, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-lg bg-white border border-stone-200"
          >
            <span className="text-2xl leading-none flex-shrink-0">
              {TAKEAWAY_EMOJIS[i % TAKEAWAY_EMOJIS.length]}
            </span>
            <span className="text-sm sm:text-base text-stone-700 leading-snug">
              {t}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   DISPATCHER
   ═════════════════════════════════════════════════════════════ */

export function BulletsLayout({
  slide,
  themeId,
}: {
  slide: SlideData;
  themeId: ThemeId;
}) {
  const layout = (slide.layout || 'list') as BulletsLayout;

  let inner: React.ReactNode;

  if (themeId === 'editorial') {
    inner =
      layout === 'two-column' ? <BulletsTwoColumnEditorial slide={slide} /> :
      layout === 'icon-grid' ? <BulletsIconGridEditorial slide={slide} /> :
      layout === 'flow' ? <BulletsFlowEditorial slide={slide} /> :
      <BulletsListEditorial slide={slide} />;
  } else if (themeId === 'bold') {
    inner =
      layout === 'two-column' ? <BulletsTwoColumnBold slide={slide} /> :
      layout === 'icon-grid' ? <BulletsIconGridBold slide={slide} /> :
      layout === 'flow' ? <BulletsFlowBold slide={slide} /> :
      <BulletsListBold slide={slide} />;
  } else {
    inner =
      layout === 'two-column' ? <BulletsTwoColumnNotion slide={slide} /> :
      layout === 'icon-grid' ? <BulletsIconGridNotion slide={slide} /> :
      layout === 'flow' ? <BulletsFlowNotion slide={slide} /> :
      <BulletsListNotion slide={slide} />;
  }

  return (
    <>
      {inner}
      <MathBlock math={slide.math} themeId={themeId} />
    </>
  );
}

export function SectionLayout({
  slide,
  themeId,
}: {
  slide: SlideData;
  themeId: ThemeId;
}) {
  const layout = (slide.layout || 'number-hero') as SectionLayout;

  if (themeId === 'editorial') {
    return layout === 'split' ? <SectionSplitEditorial slide={slide} /> :
           layout === 'badge' ? <SectionBadgeEditorial slide={slide} /> :
           <SectionNumberHeroEditorial slide={slide} />;
  } else if (themeId === 'bold') {
    return layout === 'split' ? <SectionSplitBold slide={slide} /> :
           layout === 'badge' ? <SectionBadgeBold slide={slide} /> :
           <SectionNumberHeroBold slide={slide} />;
  }
  return layout === 'split' ? <SectionSplitNotion slide={slide} /> :
         layout === 'badge' ? <SectionBadgeNotion slide={slide} /> :
         <SectionNumberHeroNotion slide={slide} />;
}

export function StatementLayout({
  slide,
  themeId,
}: {
  slide: SlideData;
  themeId: ThemeId;
}) {
  const layout = (slide.layout || 'hero') as StatementLayout;

  if (themeId === 'editorial') {
    return layout === 'left' ? <StatementLeftEditorial slide={slide} /> :
           layout === 'underlined' ? <StatementUnderlinedEditorial slide={slide} /> :
           <StatementHeroEditorial slide={slide} />;
  } else if (themeId === 'bold') {
    return layout === 'left' ? <StatementLeftBold slide={slide} /> :
           layout === 'underlined' ? <StatementUnderlinedBold slide={slide} /> :
           <StatementHeroBold slide={slide} />;
  }
  return layout === 'left' ? <StatementLeftNotion slide={slide} /> :
         layout === 'underlined' ? <StatementUnderlinedNotion slide={slide} /> :
         <StatementHeroNotion slide={slide} />;
}

export function TakeawayLayout({
  slide,
  themeId,
}: {
  slide: SlideData;
  themeId: ThemeId;
}) {
  const layout = (slide.layout || 'numbered') as TakeawayLayout;

  if (themeId === 'editorial') {
    return layout === 'checklist' ? <TakeawayChecklistEditorial slide={slide} /> :
           layout === 'icons' ? <TakeawayIconsEditorial slide={slide} /> :
           <TakeawayNumberedEditorial slide={slide} />;
  } else if (themeId === 'bold') {
    return layout === 'checklist' ? <TakeawayChecklistBold slide={slide} /> :
           layout === 'icons' ? <TakeawayIconsBold slide={slide} /> :
           <TakeawayNumberedBold slide={slide} />;
  }
  return layout === 'checklist' ? <TakeawayChecklistNotion slide={slide} /> :
         layout === 'icons' ? <TakeawayIconsNotion slide={slide} /> :
         <TakeawayNumberedNotion slide={slide} />;
}