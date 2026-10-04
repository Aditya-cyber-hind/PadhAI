'use client';

import type { QuizQuestion, Flashcard } from './types';

/**
 * Shared HTML→PDF pipeline for quiz and flashcard exports.
 *
 * Uses html2canvas-pro to rasterize a styled DOM tree, then jsPDF
 * to paginate the result into A4 pages. This gives us:
 *   - Full Unicode support (emoji, Hindi, math symbols)
 *   - Real KaTeX math rendering
 *   - Proper typography via inline CSS
 *   - Automatic page breaks via canvas slicing
 *
 * No more sanitizeForPdf() — every character renders.
 */

export interface RenderedMath {
  dataUrl: string;
  width: number;
  height: number;
}

export type MathMap = Record<string, RenderedMath>;

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const RENDER_SCALE = 2; // canvas resolution multiplier

/* ─────────────────────────────────────────────────────────────
   HTML escape for user content
   ───────────────────────────────────────────────────────────── */
function esc(s: string): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────────────────────────────────
   KaTeX auto-render for $...$ and $$...$$
   Runs in the browser against the hidden DOM node.
   ───────────────────────────────────────────────────────────── */
async function renderMathInElement(element: HTMLElement): Promise<void> {
  try {
    const katex = await import('katex');
    // KaTeX has an autorender extension, but it requires an extra
    // import. We do a lightweight replacement instead — finds $...$ and
    // $$...$$ and replaces the text node with rendered KaTeX HTML.
    walkAndRenderMath(element, katex.default || katex);
  } catch (err) {
    console.warn('[export] KaTeX render failed:', err);
  }
}

function walkAndRenderMath(root: HTMLElement, katex: any): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      // Don't touch code/pre/script/style
      if (tag === 'CODE' || tag === 'PRE' || tag === 'SCRIPT' || tag === 'STYLE') {
        return NodeFilter.FILTER_REJECT;
      }
      const text = node.nodeValue || '';
      if (!text.includes('$')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const targets: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) targets.push(n as Text);

  for (const textNode of targets) {
    const text = textNode.nodeValue || '';
    const html = convertMathInText(text, katex);
    if (!html) continue;
    const wrapper = document.createElement('span');
    wrapper.innerHTML = html;
    textNode.parentNode?.replaceChild(wrapper, textNode);
  }
}

function convertMathInText(text: string, katex: any): string | null {
  // $$...$$ (display) and $...$ (inline). Display first to avoid
  // the inline regex eating the outer dollars.
  let out = text;
  let changed = false;

  // Escape non-math text portions, keep math raw for KaTeX.
  const displayRe = /\$\$([^$]+?)\$\$/g;
  out = out.replace(displayRe, (_m, latex) => {
    changed = true;
    try {
      return katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return `<span>${esc(latex)}</span>`;
    }
  });

  const inlineRe = /\$([^$\n]+?)\$/g;
  out = out.replace(inlineRe, (_m, latex) => {
    changed = true;
    try {
      return katex.renderToString(latex, {
        displayMode: false,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return `<span>${esc(latex)}</span>`;
    }
  });

  if (!changed) return null;
  // Escape everything that wasn't produced by KaTeX (the plain text bits)
  // — but since we're returning innerHTML to a span, we can't blanket-escape.
  // We rely on the caller only injecting this into our own styled DOM.
  return out;
}

/* ─────────────────────────────────────────────────────────────
   Markdown-lite for chat / quiz / flashcard content
   Handles: bold, italic, code, headings, bullets, line breaks.
   ───────────────────────────────────────────────────────────── */
function mdToHtml(src: string): string {
  if (!src) return '';
  let s = esc(src);

  s = s.replace(/```([\s\S]*?)```/g, (_m, code) => {
    return `<pre class="code-block">${code.trim()}</pre>`;
  });

  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

  s = s.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');

  const lines = s.split('\n');
  const out: string[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join(' ').trim();
    if (text) out.push(`<p>${text}</p>`);
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('</ul') ||
      trimmed.startsWith('<li') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('</pre') ||
      trimmed.startsWith('<p>')
    ) {
      flush();
      out.push(line);
    } else {
      buffer.push(line);
    }
  }
  flush();

  return out.join('\n');
}

/* ─────────────────────────────────────────────────────────────
   Shared CSS for exported documents
   ───────────────────────────────────────────────────────────── */
const BASE_CSS = `
  .export-doc {
    width: ${A4_WIDTH_PX}px;
    background: #ffffff;
    color: #1c1917;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.6;
  }
  .export-doc * { box-sizing: border-box; }

  .doc-header {
    padding: 48px 64px 32px;
    border-bottom: 2px solid #f59e0b;
    margin-bottom: 32px;
  }
  .doc-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #1c1917;
    margin: 0 0 8px 0;
    line-height: 1.15;
  }
  .doc-meta {
    font-size: 12px;
    color: #78716c;
    margin: 0;
  }
  .doc-meta-strong { font-weight: 600; color: #44403c; }

  .doc-body { padding: 0 64px 64px; }

  .item {
    padding: 20px 0;
    border-bottom: 1px solid #f5f5f4;
  }
  .item:last-child { border-bottom: none; }

  .item-title {
    font-size: 16px;
    font-weight: 600;
    color: #1c1917;
    margin: 0 0 8px 0;
    line-height: 1.4;
  }

  .item-options {
    list-style: none;
    padding: 0;
    margin: 0 0 12px 0;
  }
  .item-options li {
    padding: 8px 12px;
    margin-bottom: 6px;
    border: 1px solid #e7e5e4;
    border-radius: 8px;
    font-size: 13px;
    color: #292524;
    line-height: 1.5;
  }
  .item-options li.correct {
    background: #f0fdf4;
    border-color: #86efac;
    color: #166534;
    font-weight: 500;
  }

  .answer-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    background: #f0fdf4;
    border-radius: 8px;
    margin-bottom: 10px;
  }
  .answer-label {
    font-size: 11px;
    font-weight: 700;
    color: #166534;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
    padding-top: 2px;
  }
  .answer-value {
    font-size: 13px;
    color: #166534;
    font-weight: 500;
    flex: 1;
  }

  .explanation {
    font-size: 13px;
    color: #57534e;
    font-style: italic;
    margin: 0;
    padding: 10px 14px;
    border-left: 3px solid #e7e5e4;
    background: #fafaf9;
    border-radius: 0 6px 6px 0;
    line-height: 1.6;
  }

  /* Flashcard-specific */
  .card {
    padding: 20px 24px;
    margin-bottom: 14px;
    background: #fafaf9;
    border: 1px solid #e7e5e4;
    border-radius: 12px;
    page-break-inside: avoid;
  }
  .card-term {
    font-size: 16px;
    font-weight: 600;
    color: #1c1917;
    margin: 0 0 10px 0;
    line-height: 1.4;
  }
  .card-def {
    font-size: 14px;
    color: #292524;
    margin: 0 0 10px 0;
    line-height: 1.65;
  }
  .card-meta {
    font-size: 11px;
    color: #a8a29e;
    margin: 0;
    text-transform: capitalize;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .card-meta-pill {
    padding: 2px 8px;
    border-radius: 999px;
    background: #f5f5f4;
    color: #57534e;
    font-size: 10px;
    font-weight: 500;
    text-transform: capitalize;
  }
  .card-meta-pill.difficulty { background: #fef3c7; color: #92400e; }

  /* Rich text */
  .rich p { margin: 0 0 12px 0; }
  .rich h1, .rich h2, .rich h3 {
    font-family: 'Fraunces', Georgia, serif;
    color: #1c1917;
    margin: 16px 0 8px 0;
  }
  .rich h1 { font-size: 22px; }
  .rich h2 { font-size: 18px; }
  .rich h3 { font-size: 16px; }
  .rich ul { margin: 0 0 12px 0; padding-left: 22px; }
  .rich li { margin-bottom: 4px; }
  .rich code {
    background: #f5f5f4;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 12px;
  }
  .rich .code-block {
    background: #282c34;
    color: #abb2bf;
    padding: 14px 18px;
    border-radius: 8px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.55;
    margin: 10px 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* KaTeX sizing */
  .katex { font-size: 1em !important; }
  .katex-display { margin: 12px 0; overflow-x: auto; overflow-y: hidden; }
`;

/* ─────────────────────────────────────────────────────────────
   Shared renderer: takes HTML, returns a paginated PDF blob
   ───────────────────────────────────────────────────────────── */
async function renderHtmlToPdf(
  html: string,
  onProgress?: (pct: number, label: string) => void
): Promise<Blob> {
  const report = (pct: number, label: string) => onProgress?.(pct, label);

  report(5, 'Preparing...');

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = `${A4_WIDTH_PX}px`;
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  host.innerHTML = html;
  document.body.appendChild(host);

  const root = host.querySelector<HTMLElement>('.export-doc');
  if (!root) {
    host.remove();
    throw new Error('Failed to build export DOM');
  }

  try {
    report(15, 'Rendering math...');
    await renderMathInElement(root);

    report(30, 'Loading fonts...');
    await new Promise((r) => setTimeout(r, 150));
    if (document.fonts && (document.fonts as any).ready) {
      try {
        await (document.fonts as any).ready;
      } catch {}
    }

    report(45, 'Rasterizing document...');
    const html2canvas = (await import('html2canvas-pro')).default;

    const fullCanvas = await html2canvas(root, {
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
      scale: RENDER_SCALE,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    report(75, 'Assembling pages...');
    const { jsPDF } = await import('jspdf');

    const pdf = new jsPDF({
      unit: 'px',
      format: [A4_WIDTH_PX, A4_HEIGHT_PX],
      orientation: 'portrait',
      compress: true,
    });

    const sliceHeight = A4_HEIGHT_PX * RENDER_SCALE;
    const totalPages = Math.ceil(fullCanvas.height / sliceHeight);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const sliceY = pageIndex * sliceHeight;
      const remaining = fullCanvas.height - sliceY;
      const currentSlice = Math.min(sliceHeight, remaining);

      const slice = document.createElement('canvas');
      slice.width = fullCanvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(
        fullCanvas,
        0,
        sliceY,
        fullCanvas.width,
        currentSlice,
        0,
        0,
        fullCanvas.width,
        currentSlice
      );

      const imgData = slice.toDataURL('image/jpeg', 0.92);

      if (pageIndex > 0) pdf.addPage([A4_WIDTH_PX, A4_HEIGHT_PX], 'portrait');
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX, undefined, 'FAST');

      report(
        75 + Math.round((pageIndex / totalPages) * 20),
        `Page ${pageIndex + 1} of ${totalPages}`
      );
    }

    report(98, 'Finalizing...');
    const blob = pdf.output('blob');
    report(100, 'Done');
    return blob;
  } finally {
    host.remove();
  }
}

/* ─────────────────────────────────────────────────────────────
   Quiz PDF
   ───────────────────────────────────────────────────────────── */
export async function quizToPdf(
  questions: QuizQuestion[],
  meta: { title: string; generatedAt?: Date },
  _mathMap?: MathMap
): Promise<Blob> {
  const generatedAt = meta.generatedAt || new Date();

  const html = `
    <style>${BASE_CSS}</style>
    <div class="export-doc">
      <div class="doc-header">
        <h1 class="doc-title">${esc(meta.title)}</h1>
        <p class="doc-meta">
          <span class="doc-meta-strong">${questions.length}</span> question${
            questions.length === 1 ? '' : 's'
          } ·
          Generated ${esc(
            generatedAt.toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          )}
        </p>
      </div>
      <div class="doc-body">
        ${questions
          .map(
            (q, i) => `
          <div class="item">
            <p class="item-title">Q${i + 1}. ${mdToHtml(q.question).replace(/<\/?p>/g, '')}</p>
            <ul class="item-options">
              ${q.options
                .map(
                  (opt, j) =>
                    `<li class="${j === q.correctIndex ? 'correct' : ''}">${String.fromCharCode(
                      65 + j
                    )}) ${mdToHtml(opt).replace(/<\/?p>/g, '')}</li>`
                )
                .join('')}
            </ul>
            <div class="answer-row">
              <span class="answer-label">Answer</span>
              <span class="answer-value">${String.fromCharCode(
                65 + q.correctIndex
              )}) ${mdToHtml(q.options[q.correctIndex]).replace(/<\/?p>/g, '')}</span>
            </div>
            ${
              q.explanation
                ? `<div class="explanation rich">${mdToHtml(q.explanation)}</div>`
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  return renderHtmlToPdf(html);
}

/* ─────────────────────────────────────────────────────────────
   Flashcards PDF
   ───────────────────────────────────────────────────────────── */
export async function flashcardsToPdf(
  cards: Flashcard[],
  meta: { title: string; generatedAt?: Date },
  _mathMap?: MathMap
): Promise<Blob> {
  const generatedAt = meta.generatedAt || new Date();

  const html = `
    <style>${BASE_CSS}</style>
    <div class="export-doc">
      <div class="doc-header">
        <h1 class="doc-title">${esc(meta.title)}</h1>
        <p class="doc-meta">
          <span class="doc-meta-strong">${cards.length}</span> card${
            cards.length === 1 ? '' : 's'
          } ·
          Generated ${esc(
            generatedAt.toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          )}
        </p>
      </div>
      <div class="doc-body">
        ${cards
          .map(
            (c) => `
          <div class="card">
            <p class="card-term">${mdToHtml(c.term).replace(/<\/?p>/g, '')}</p>
            <div class="card-def rich">${mdToHtml(c.definition)}</div>
            <div class="card-meta">
              <span class="card-meta-pill">${esc(c.category)}</span>
              <span class="card-meta-pill difficulty">difficulty ${c.difficulty}/5</span>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  return renderHtmlToPdf(html);
}