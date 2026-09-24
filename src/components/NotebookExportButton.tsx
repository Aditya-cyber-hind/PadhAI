'use client';

import { useState } from 'react';
import { downloadBlob, safeFilename } from '@/lib/export/download';
import { buildNotebookPdf, type NotebookData, type ExportOptions, type SlideImage } from '@/lib/pdf/notebook';

interface Props {
  notebookId: string;
  notebookName: string;
}

export default function NotebookExportButton({ notebookId, notebookName }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');

  const [options, setOptions] = useState<ExportOptions>({
    sources: true,
    chat: true,
    chatMode: 'filtered',
    quizzes: true,
    flashcards: true,
    slides: false,
  });

  const startExport = async () => {
    setBusy(true);
    setError('');
    setProgress(0);
    setProgressLabel('Fetching notebook data...');

    try {
      // 1. Fetch all data
      const res = await fetch(`/api/notebook-pdf/data?notebookId=${notebookId}`);
      const data = (await res.json()) as NotebookData;
      if (!res.ok || !data.notebook) {
        throw new Error((data as any).error || 'Failed to load notebook data');
      }

      // 2. If slides requested, render each slide off-screen and capture
      let slideImages: SlideImage[] = [];
      if (options.slides && data.slideshow && data.slideshow.slides.length > 0) {
        setProgressLabel('Rendering slides...');
        slideImages = await renderSlideImages(
          data,
          (i, total) => {
            const pct = Math.round(((i + 1) / total) * 100);
            setProgress(pct);
            setProgressLabel(`Rendering slide ${i + 1} of ${total}`);
          }
        );
      }

      // 3. Build the PDF
      setProgressLabel('Assembling PDF...');
      setProgress(0);
      const blob = await buildNotebookPdf({
        data,
        options,
        slideImages,
        mathMap: {}, // unused in v1 — see note in notebook.ts
        onProgress: (pct, label) => {
          setProgress(pct);
          setProgressLabel(label);
        },
      });

      // 4. Download
      const filename = `${safeFilename(notebookName || 'padhai-notebook')}-export.pdf`;
      downloadBlob(blob, filename);

      setProgressLabel('Done!');
      setTimeout(() => {
        setBusy(false);
        setOpen(false);
        setProgress(0);
        setProgressLabel('');
      }, 800);
    } catch (err) {
      console.error('[export] failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
      setBusy(false);
    }
  };

  const toggle = (key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 border border-stone-300 rounded hover:bg-stone-100 transition"
        title="Export this notebook as a PDF"
      >
        📤 Export PDF
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!busy ? (
              <>
                <h2 className="text-lg font-semibold text-stone-900 mb-1">
                  Export as PDF
                </h2>
                <p className="text-sm text-stone-500 mb-5">
                  Choose what to include in the export.
                </p>

                <div className="space-y-3 mb-5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.sources}
                      onChange={() => toggle('sources')}
                      className="rounded border-stone-300"
                    />
                    <span className="text-sm text-stone-700">
                      Sources list ({options.sources ? 'included' : 'skipped'})
                    </span>
                  </label>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.chat}
                        onChange={() => toggle('chat')}
                        className="rounded border-stone-300"
                      />
                      <span className="text-sm text-stone-700">
                        Chat transcript
                      </span>
                    </label>
                    {options.chat && (
                      <div className="ml-7 mt-2 flex gap-2 text-xs">
                        <button
                          onClick={() =>
                            setOptions((p) => ({ ...p, chatMode: 'filtered' }))
                          }
                          className={`px-2.5 py-1 rounded border transition ${
                            options.chatMode === 'filtered'
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'border-stone-300 text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          Filtered
                        </button>
                        <button
                          onClick={() =>
                            setOptions((p) => ({ ...p, chatMode: 'full' }))
                          }
                          className={`px-2.5 py-1 rounded border transition ${
                            options.chatMode === 'full'
                              ? 'bg-stone-900 text-white border-stone-900'
                              : 'border-stone-300 text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          Full
                        </button>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.quizzes}
                      onChange={() => toggle('quizzes')}
                      className="rounded border-stone-300"
                    />
                    <span className="text-sm text-stone-700">Quizzes</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.flashcards}
                      onChange={() => toggle('flashcards')}
                      className="rounded border-stone-300"
                    />
                    <span className="text-sm text-stone-700">Flashcards</span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.slides}
                      onChange={() => toggle('slides')}
                      className="mt-0.5 rounded border-stone-300"
                    />
                    <span className="text-sm text-stone-700">
                      Slideshow
                      <span className="block text-xs text-amber-700 mt-0.5">
                        ⚠ Slower — adds 1-2s per slide
                      </span>
                    </span>
                  </label>
                </div>

                {error && (
                  <p className="text-xs text-red-600 mb-3">{error}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startExport}
                    className="px-4 py-2 text-sm bg-stone-900 text-white rounded-lg hover:bg-stone-700"
                  >
                    Export
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-stone-900 mb-4">
                  Building PDF
                </h2>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-stone-500">{progressLabel}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Render each slideshow slide off-screen, capture via html2canvas-pro,
 * return as PNG data URLs. This reuses the actual slide components by
 * mounting a hidden iframe-like container.
 *
 * LIMITATION: In v1, we render slides through a hidden div using a
 * simplified version of the slide components. This is because the full
 * SlideshowPanel component isn't easily reusable as a "render this one
 * slide to an element" API. If visual fidelity matters, see notes in
 * the README — the alternative is to extract the slide components into
 * a shared module.
 */
async function renderSlideImages(
  data: NotebookData,
  onProgress: (i: number, total: number) => void
): Promise<SlideImage[]> {
  const html2canvas = (await import('html2canvas-pro')).default;

  if (!data.slideshow) return [];

  const slides = data.slideshow.slides;

  // Container for off-screen rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1280px';
  container.style.height = '720px';
  document.body.appendChild(container);

  const images: SlideImage[] = [];

  try {
    // Title slide first
    const titleEl = createSlideElement({
      type: 'title',
      title: data.slideshow.title,
      subtitle: data.slideshow.subtitle,
      index: 0,
      total: slides.length,
    });
    container.appendChild(titleEl);
    await new Promise((r) => setTimeout(r, 50));
    const titleCanvas = await html2canvas(titleEl, {
      width: 1280,
      height: 720,
      scale: 1.5,
      backgroundColor: '#0c0a09',
      logging: false,
    });
    images.push({
      dataUrl: titleCanvas.toDataURL('image/png'),
      width: titleCanvas.width,
      height: titleCanvas.height,
    });
    titleEl.remove();
    onProgress(0, slides.length + 1);

    // Content slides
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const el = createSlideElement({
        type: slide.type || 'bullets',
        heading: slide.heading,
        bullets: slide.bullets,
        statement: slide.statement,
        sectionNumber: slide.sectionNumber,
        sectionLabel: slide.sectionLabel,
        takeaways: slide.takeaways,
        index: i + 1,
        total: slides.length,
      });
      container.appendChild(el);
      await new Promise((r) => setTimeout(r, 50));
      const canvas = await html2canvas(el, {
        width: 1280,
        height: 720,
        scale: 1.5,
        backgroundColor: '#0c0a09',
        logging: false,
      });
      images.push({
        dataUrl: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      });
      el.remove();
      onProgress(i + 1, slides.length + 1);
    }
  } finally {
    document.body.removeChild(container);
  }

  return images;
}

/**
 * Creates a simplified DOM element for a slide, styled to match the
 * SlideshowPanel's dark theme. This is a lightweight duplication of the
 * slide components — if you want them to stay in sync, extract the visual
 * components into a shared module later.
 */
function createSlideElement(spec: any): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = '1280px';
  el.style.height = '720px';
  el.style.background = '#0c0a09';
  el.style.color = 'white';
  el.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.padding = '80px 96px';
  el.style.boxSizing = 'border-box';
  el.style.position = 'relative';

  // Accent bar
  const accent = document.createElement('div');
  accent.style.position = 'absolute';
  accent.style.left = '0';
  accent.style.top = '0';
  accent.style.bottom = '0';
  accent.style.width = '4px';
  const gradients: Record<string, string> = {
    title: 'linear-gradient(180deg, #3b82f6, #8b5cf6)',
    section: 'linear-gradient(180deg, #10b981, #06b6d4)',
    bullets: 'linear-gradient(180deg, #3b82f6, #8b5cf6)',
    statement: 'linear-gradient(180deg, #f59e0b, #f43f5e)',
    takeaway: 'linear-gradient(180deg, #8b5cf6, #ec4899)',
  };
  accent.style.background = gradients[spec.type] || gradients.bullets;
  el.appendChild(accent);

  const inner = document.createElement('div');
  inner.style.width = '100%';
  inner.style.maxWidth = '1000px';
  inner.style.textAlign = spec.type === 'title' || spec.type === 'statement' ? 'center' : 'left';

  if (spec.type === 'title') {
    const pill = document.createElement('div');
    pill.textContent = `${spec.total} slides`;
    pill.style.display = 'inline-block';
    pill.style.padding = '6px 16px';
    pill.style.borderRadius = '999px';
    pill.style.border = '1px solid #44403c';
    pill.style.fontSize = '14px';
    pill.style.letterSpacing = '0.2em';
    pill.style.textTransform = 'uppercase';
    pill.style.color = '#a8a29e';
    pill.style.marginBottom = '24px';
    inner.appendChild(pill);

    const h1 = document.createElement('h1');
    h1.textContent = spec.title;
    h1.style.fontSize = '72px';
    h1.style.fontWeight = '900';
    h1.style.lineHeight = '1.1';
    h1.style.marginBottom = '24px';
    inner.appendChild(h1);

    if (spec.subtitle) {
      const p = document.createElement('p');
      p.textContent = spec.subtitle;
      p.style.fontSize = '24px';
      p.style.color = '#a8a29e';
      inner.appendChild(p);
    }
  } else if (spec.type === 'section') {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '48px';

    const num = document.createElement('div');
    num.textContent = spec.sectionNumber || '01';
    num.style.fontSize = '144px';
    num.style.fontWeight = '900';
    num.style.lineHeight = '1';
    num.style.background = 'linear-gradient(135deg, #6ee7b7, #06b6d4)';
    num.style.webkitBackgroundClip = 'text';
    num.style.webkitTextFillColor = 'transparent';
    num.style.backgroundClip = 'text';
    row.appendChild(num);

    const right = document.createElement('div');
    const label = document.createElement('p');
    label.textContent = 'SECTION';
    label.style.fontSize = '14px';
    label.style.letterSpacing = '0.3em';
    label.style.color = '#34d399';
    label.style.fontWeight = '600';
    label.style.marginBottom = '12px';
    right.appendChild(label);

    const h2 = document.createElement('h2');
    h2.textContent = spec.sectionLabel || spec.heading;
    h2.style.fontSize = '60px';
    h2.style.fontWeight = '700';
    h2.style.lineHeight = '1.1';
    right.appendChild(h2);

    row.appendChild(right);
    inner.appendChild(row);
  } else if (spec.type === 'statement') {
    const label = document.createElement('p');
    label.textContent = spec.heading;
    label.style.fontSize = '14px';
    label.style.letterSpacing = '0.3em';
    label.style.color = '#fbbf24';
    label.style.fontWeight = '600';
    label.style.textTransform = 'uppercase';
    label.style.marginBottom = '24px';
    inner.appendChild(label);

    const stmt = document.createElement('p');
    stmt.textContent = spec.statement;
    stmt.style.fontSize = '56px';
    stmt.style.fontWeight = '700';
    stmt.style.lineHeight = '1.2';
    inner.appendChild(stmt);
  } else if (spec.type === 'takeaway') {
    const label = document.createElement('p');
    label.textContent = 'KEY TAKEAWAYS';
    label.style.fontSize = '14px';
    label.style.letterSpacing = '0.3em';
    label.style.color = '#c084fc';
    label.style.fontWeight = '600';
    label.style.marginBottom = '12px';
    inner.appendChild(label);

    const h2 = document.createElement('h2');
    h2.textContent = spec.heading;
    h2.style.fontSize = '36px';
    h2.style.fontWeight = '700';
    h2.style.color = '#d6d3d1';
    h2.style.marginBottom = '40px';
    inner.appendChild(h2);

    const list = document.createElement('div');
    (spec.takeaways || []).forEach((t: string, i: number) => {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.alignItems = 'flex-start';
      item.style.gap = '20px';
      item.style.marginBottom = '24px';

      const badge = document.createElement('div');
      badge.textContent = String(i + 1);
      badge.style.flexShrink = '0';
      badge.style.width = '40px';
      badge.style.height = '40px';
      badge.style.borderRadius = '999px';
      badge.style.background = 'linear-gradient(135deg, #8b5cf6, #ec4899)';
      badge.style.display = 'flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.fontWeight = '700';
      badge.style.fontSize = '16px';
      item.appendChild(badge);

      const span = document.createElement('span');
      span.textContent = t;
      span.style.fontSize = '28px';
      span.style.lineHeight = '1.4';
      span.style.paddingTop = '4px';
      item.appendChild(span);

      list.appendChild(item);
    });
    inner.appendChild(list);
  } else {
    // bullets
    const h2 = document.createElement('h2');
    h2.textContent = spec.heading;
    h2.style.fontSize = '48px';
    h2.style.fontWeight = '700';
    h2.style.lineHeight = '1.2';
    h2.style.marginBottom = '40px';
    inner.appendChild(h2);

    const ul = document.createElement('div');
    (spec.bullets || []).forEach((b: string) => {
      const li = document.createElement('div');
      li.style.display = 'flex';
      li.style.alignItems = 'flex-start';
      li.style.gap = '20px';
      li.style.marginBottom = '20px';

      const dash = document.createElement('div');
      dash.style.marginTop = '16px';
      dash.style.width = '24px';
      dash.style.height = '4px';
      dash.style.borderRadius = '999px';
      dash.style.background = 'linear-gradient(90deg, #60a5fa, #c084fc)';
      dash.style.flexShrink = '0';
      li.appendChild(dash);

      const span = document.createElement('span');
      span.textContent = b;
      span.style.fontSize = '28px';
      span.style.lineHeight = '1.4';
      span.style.color = '#e7e5e4';
      li.appendChild(span);

      ul.appendChild(li);
    });
    inner.appendChild(ul);
  }

  el.appendChild(inner);
  return el;
}