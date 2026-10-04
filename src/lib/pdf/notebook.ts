'use client';

import type { QuizQuestion, Flashcard } from '@/lib/export/types';
import type { MathMap } from '@/lib/export/pdf';

export interface NotebookData {
  notebook: {
    id: string;
    name: string;
    emoji: string | null;
    createdAt: string;
  };
  sources: Array<{
    id: string;
    name: string;
    type: string;
    charCount: number;
    pageCount: number;
    method: string | null;
    createdAt: string;
  }>;
  chat: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
  quizzes: Array<{
    id: string;
    title: string;
    difficulty: string;
    questionCount: number;
    createdAt: string;
    questions: QuizQuestion[];
  }>;
  flashcards: Flashcard[];
  slideshow: {
    id: string;
    title: string;
    subtitle: string;
    slides: any[];
  } | null;
}

export interface ExportOptions {
  sources: boolean;
  chat: boolean;
  chatMode: 'full' | 'filtered';
  quizzes: boolean;
  flashcards: boolean;
  slides: boolean;
}

export interface SlideImage {
  dataUrl: string;
  width: number;
  height: number;
}

export interface NotebookPdfInput {
  data: NotebookData;
  options: ExportOptions;
  slideImages?: SlideImage[];
  mathMap: MathMap;
  onProgress?: (pct: number, label: string) => void;
}

/* ─────────────────────────────────────────────────────────────
   A4 page in CSS pixels at 96 DPI.
   Width: 210mm = 794px, Height: 297mm = 1123px.
   We render the DOM at width 794 and paginate vertically.
   ───────────────────────────────────────────────────────────── */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

/**
 * HTML-escape user content before injecting into the rendered DOM.
 * Keeps the rendering safe from stray < or > characters in titles.
 */
function esc(s: string): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Very lightweight markdown-to-HTML for chat bodies.
 * Handles: bold, italics, inline code, headings, bullets, numbered lists,
 * line breaks, and inline math ($...$ / $$...$$).
 * Not a full markdown parser — but enough to make exports readable.
 */
function mdToHtml(src: string): string {
  if (!src) return '';
  let s = esc(src);

  // Fenced code blocks first (before other transformations)
  s = s.replace(/```([\s\S]*?)```/g, (_m, code) => {
    return `<pre class="code-block">${code.trim()}</pre>`;
  });

  // Headings
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold + italics
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Math (KaTeX-style markers, rendered as plain text if not converted)
  // Leave $...$ and $$...$$ as-is so the DOM shows them plainly.

  // Bullets
  s = s.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');

  // Numbered lists
  s = s.replace(/^\d+\. (.+)$/gm, '<li class="num">$1</li>');
  s = s.replace(/(<li class="num">[\s\S]*?<\/li>)(?!\s*<li class="num">)/g, '<ol>$1</ol>');

  // Paragraphs from remaining lines
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
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('</ol') ||
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

function filterChat(
  messages: Array<{ role: string; content: string; createdAt: string }>,
  mode: 'full' | 'filtered'
): Array<{ role: string; content: string }> {
  if (mode === 'full') {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }
  return messages.map((m) => {
    if (m.role === 'user') {
      return { role: m.role, content: m.content };
    }
    const firstSentence = m.content.match(/[^.!?]+[.!?]/)?.[0]?.trim() || m.content;
    return {
      role: m.role,
      content:
        firstSentence.length > 200 ? firstSentence.slice(0, 200) + '…' : firstSentence,
    };
  });
}

/**
 * Build the HTML for the entire export. Rendered inside a hidden container
 * at A4 width (794px) and then rasterized by html2canvas-pro.
 */
function buildExportHtml(data: NotebookData, options: ExportOptions, slideImages?: SlideImage[]): string {
  const { notebook, sources, chat, quizzes, flashcards } = data;

  const generatedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const sections: string[] = [];

  // ── Cover page ─────────────────────────────────────────
  const coverSections: string[] = [];
  if (options.sources && sources.length > 0)
    coverSections.push(`Sources — ${sources.length} item${sources.length === 1 ? '' : 's'}`);
  if (options.chat && chat.length > 0)
    coverSections.push(`Chat transcript — ${chat.length} message${chat.length === 1 ? '' : 's'}`);
  if (options.quizzes && quizzes.length > 0)
    coverSections.push(`Quizzes — ${quizzes.length} deck${quizzes.length === 1 ? '' : 's'}`);
  if (options.flashcards && flashcards.length > 0)
    coverSections.push(`Flashcards — ${flashcards.length} card${flashcards.length === 1 ? '' : 's'}`);
  if (options.slides && slideImages && slideImages.length > 0)
    coverSections.push(`Slideshow — ${slideImages.length} slides`);

  sections.push(`
    <div class="section cover">
      <div class="accent-bar"></div>
      <div class="cover-content">
        ${notebook.emoji ? `<div class="cover-emoji">${esc(notebook.emoji)}</div>` : ''}
        <h1 class="cover-title">${esc(notebook.name)}</h1>
        <div class="cover-divider"></div>
        <p class="cover-subtitle">PadhAI Notebook Export</p>
        <p class="cover-date">Generated ${esc(generatedDate)}</p>

        ${
          coverSections.length > 0
            ? `
          <div class="cover-contents">
            <p class="cover-contents-label">Contents</p>
            <ul>
              ${coverSections.map((c) => `<li>${esc(c)}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `);

  // ── Sources ────────────────────────────────────────────
  if (options.sources && sources.length > 0) {
    sections.push(`
      <div class="section">
        <h2 class="section-heading">Sources</h2>
        <div class="section-rule"></div>
        ${sources
          .map(
            (s) => `
          <div class="source-item">
            <p class="source-name">${esc(s.name)}</p>
            <p class="source-meta">
              ${esc(s.type.toUpperCase())}${
                s.pageCount > 0 ? ` · ${s.pageCount} page${s.pageCount > 1 ? 's' : ''}` : ''
              } · ${s.charCount.toLocaleString()} chars${
                s.method === 'ocr' ? ' · OCR' : ''
              } · ${esc(new Date(s.createdAt).toLocaleDateString())}
            </p>
          </div>
        `
          )
          .join('')}
      </div>
    `);
  }

  // ── Chat ───────────────────────────────────────────────
  if (options.chat && chat.length > 0) {
    const messages = filterChat(chat, options.chatMode);
    sections.push(`
      <div class="section">
        <h2 class="section-heading">Chat Transcript</h2>
        <div class="section-rule"></div>
        ${messages
          .map(
            (m) => `
          <div class="chat-message ${m.role === 'user' ? 'chat-user' : 'chat-ai'}">
            <p class="chat-role">${m.role === 'user' ? 'You' : 'PadhAI'}</p>
            <div class="chat-body">${mdToHtml(m.content)}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `);
  }

  // ── Quizzes ────────────────────────────────────────────
  if (options.quizzes && quizzes.length > 0) {
    for (const quiz of quizzes) {
      sections.push(`
        <div class="section">
          <h2 class="section-heading">${esc(quiz.title)}</h2>
          <p class="section-meta">${quiz.questions.length} questions · ${esc(
            quiz.difficulty
          )} · ${esc(new Date(quiz.createdAt).toLocaleDateString())}</p>
          <div class="section-rule"></div>
          ${quiz.questions
            .map(
              (q, i) => `
            <div class="quiz-question">
              <p class="quiz-q">Q${i + 1}. ${esc(q.question)}</p>
              <ul class="quiz-options">
                ${q.options
                  .map(
                    (opt, j) =>
                      `<li class="${j === q.correctIndex ? 'correct' : ''}">${String.fromCharCode(
                        65 + j
                      )}) ${esc(opt)}</li>`
                  )
                  .join('')}
              </ul>
              <p class="quiz-answer">Answer: ${esc(q.options[q.correctIndex])}</p>
              ${
                q.explanation
                  ? `<p class="quiz-explanation">${esc(q.explanation)}</p>`
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
      `);
    }
  }

  // ── Flashcards ─────────────────────────────────────────
  if (options.flashcards && flashcards.length > 0) {
    sections.push(`
      <div class="section">
        <h2 class="section-heading">Flashcards</h2>
        <div class="section-rule"></div>
        ${flashcards
          .map(
            (c, i) => `
          <div class="flashcard">
            <p class="flashcard-term">${i + 1}. ${esc(c.term)}</p>
            <p class="flashcard-def">${esc(c.definition)}</p>
            <p class="flashcard-meta">${esc(c.category)} · difficulty ${c.difficulty}/5</p>
          </div>
        `
          )
          .join('')}
      </div>
    `);
  }

  // ── Slides ─────────────────────────────────────────────
  if (options.slides && slideImages && slideImages.length > 0) {
    sections.push(`
      <div class="section">
        <h2 class="section-heading">Slideshow</h2>
        <div class="section-rule"></div>
        ${slideImages
          .map(
            (img, i) => `
          <div class="slide-page">
            <img src="${img.dataUrl}" alt="Slide ${i + 1}" />
          </div>
        `
          )
          .join('')}
      </div>
    `);
  }

  return `
    <style>
      .export-root {
        width: ${A4_WIDTH_PX}px;
        background: #ffffff;
        color: #1c1917;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 14px;
        line-height: 1.6;
      }
      .export-root * { box-sizing: border-box; }

      .section {
        padding: 60px 64px;
        page-break-after: always;
      }

      /* Cover */
      .cover { padding: 0; position: relative; min-height: ${A4_HEIGHT_PX}px; }
      .accent-bar {
        position: absolute; top: 0; left: 0; right: 0;
        height: 12px;
        background: linear-gradient(90deg, #f59e0b, #ea580c, #f59e0b);
      }
      .cover-content {
        padding: 160px 72px 80px;
      }
      .cover-emoji { font-size: 72px; margin-bottom: 24px; }
      .cover-title {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 56px; font-weight: 700;
        line-height: 1.05; letter-spacing: -0.03em;
        margin: 0 0 24px 0;
      }
      .cover-divider {
        width: 80px; height: 4px; background: #f59e0b;
        border-radius: 4px; margin-bottom: 24px;
      }
      .cover-subtitle {
        font-size: 15px; color: #78716c; margin: 0 0 8px 0;
        font-style: italic;
      }
      .cover-date { font-size: 13px; color: #a8a29e; margin: 0; }

      .cover-contents {
        margin-top: 80px;
        padding-top: 32px;
        border-top: 1px solid #e7e5e4;
      }
      .cover-contents-label {
        font-size: 11px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.15em; color: #a8a29e; margin: 0 0 16px 0;
      }
      .cover-contents ul { list-style: none; padding: 0; margin: 0; }
      .cover-contents li {
        padding: 8px 0; color: #44403c; font-size: 14px;
        border-bottom: 1px dashed #f5f5f4;
      }
      .cover-contents li:last-child { border-bottom: none; }

      /* Section headings */
      .section-heading {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 32px; font-weight: 700;
        letter-spacing: -0.02em; color: #1c1917;
        margin: 0 0 8px 0;
      }
      .section-meta {
        font-size: 12px; color: #78716c; margin: 0 0 12px 0;
        text-transform: capitalize;
      }
      .section-rule {
        width: 60px; height: 3px; background: #f59e0b;
        border-radius: 3px; margin-bottom: 32px;
      }

      /* Sources */
      .source-item {
        padding: 16px 0; border-bottom: 1px solid #f5f5f4;
      }
      .source-name { font-size: 15px; font-weight: 600; color: #1c1917; margin: 0 0 4px 0; }
      .source-meta { font-size: 12px; color: #78716c; margin: 0; }

      /* Chat */
      .chat-message { margin-bottom: 24px; }
      .chat-role {
        font-size: 11px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.08em; margin: 0 0 6px 0;
      }
      .chat-user .chat-role { color: #f59e0b; }
      .chat-ai .chat-role { color: #8b5cf6; }
      .chat-body {
        font-size: 14px; line-height: 1.7; color: #292524;
      }
      .chat-body p { margin: 0 0 12px 0; }
      .chat-body h1, .chat-body h2, .chat-body h3 {
        font-family: 'Fraunces', Georgia, serif;
        margin: 20px 0 8px 0; color: #1c1917;
      }
      .chat-body h1 { font-size: 22px; }
      .chat-body h2 { font-size: 18px; }
      .chat-body h3 { font-size: 16px; }
      .chat-body ul, .chat-body ol { margin: 0 0 12px 0; padding-left: 24px; }
      .chat-body li { margin-bottom: 4px; }
      .chat-body code {
        background: #f5f5f4; padding: 2px 6px; border-radius: 4px;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
      }
      .chat-body .code-block {
        background: #282c34; color: #abb2bf;
        padding: 16px 20px; border-radius: 8px;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px; line-height: 1.55;
        overflow-x: auto; margin: 12px 0;
        white-space: pre-wrap;
      }

      /* Quizzes */
      .quiz-question { margin-bottom: 32px; }
      .quiz-q { font-size: 15px; font-weight: 600; color: #1c1917; margin: 0 0 12px 0; }
      .quiz-options { list-style: none; padding: 0; margin: 0 0 12px 0; }
      .quiz-options li {
        padding: 8px 12px; margin-bottom: 6px;
        border: 1px solid #e7e5e4; border-radius: 8px;
        font-size: 13px; color: #292524;
      }
      .quiz-options li.correct {
        background: #f0fdf4; border-color: #86efac; color: #166534; font-weight: 500;
      }
      .quiz-answer {
        font-size: 13px; color: #166534; font-weight: 500;
        margin: 0 0 6px 0;
      }
      .quiz-explanation {
        font-size: 13px; color: #57534e; font-style: italic;
        margin: 0; padding-left: 12px; border-left: 2px solid #e7e5e4;
      }

      /* Flashcards */
      .flashcard {
        padding: 16px 20px; margin-bottom: 12px;
        background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px;
      }
      .flashcard-term { font-size: 15px; font-weight: 600; color: #1c1917; margin: 0 0 6px 0; }
      .flashcard-def { font-size: 14px; color: #292524; margin: 0 0 8px 0; line-height: 1.6; }
      .flashcard-meta { font-size: 11px; color: #a8a29e; margin: 0; text-transform: capitalize; }

      /* Slides */
      .slide-page {
        margin-bottom: 24px;
        border: 1px solid #e7e5e4;
        border-radius: 8px;
        overflow: hidden;
      }
      .slide-page img { width: 100%; height: auto; display: block; }
    </style>
    <div class="export-root" id="padhai-export-root">
      ${sections.join('')}
    </div>
  `;
}

export async function buildNotebookPdf(input: NotebookPdfInput): Promise<Blob> {
  const { data, options, slideImages, onProgress } = input;
  const report = (pct: number, label: string) => onProgress?.(pct, label);

  report(5, 'Preparing document...');

  // 1. Build the DOM
  const html = buildExportHtml(data, options, slideImages);

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = `${A4_WIDTH_PX}px`;
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  host.innerHTML = html;
  document.body.appendChild(host);

  const root = host.querySelector<HTMLElement>('#padhai-export-root');
  if (!root) {
    host.remove();
    throw new Error('Failed to build export DOM');
  }

  try {
    // Wait for fonts + images to load
    report(15, 'Loading fonts and images...');
    await new Promise((r) => setTimeout(r, 300));
    if (document.fonts && (document.fonts as any).ready) {
      try {
        await (document.fonts as any).ready;
      } catch {}
    }

    // Wait for images
    const imgs = Array.from(root.querySelectorAll('img'));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(() => resolve(), 2000);
          })
      )
    );

    // 2. Rasterize the entire root into one tall canvas
    report(35, 'Rendering document...');
    const html2canvas = (await import('html2canvas-pro')).default;

    const fullCanvas = await html2canvas(root, {
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // 3. Slice the canvas into A4-sized pages and assemble a PDF with jsPDF
    report(75, 'Assembling PDF pages...');
    const { jsPDF } = await import('jspdf');

    const pdf = new jsPDF({
      unit: 'px',
      format: [A4_WIDTH_PX, A4_HEIGHT_PX],
      orientation: 'portrait',
      compress: true,
    });

    const pageHeightPx = A4_HEIGHT_PX * 2; // canvas scale=2
    const totalPages = Math.ceil(fullCanvas.height / pageHeightPx);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const sliceY = pageIndex * pageHeightPx;
      const sliceHeight = Math.min(pageHeightPx, fullCanvas.height - sliceY);

      const slice = document.createElement('canvas');
      slice.width = fullCanvas.width;
      slice.height = pageHeightPx;
      const ctx = slice.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);

      ctx.drawImage(
        fullCanvas,
        0,
        sliceY,
        fullCanvas.width,
        sliceHeight,
        0,
        0,
        fullCanvas.width,
        sliceHeight
      );

      const imgData = slice.toDataURL('image/jpeg', 0.92);

      if (pageIndex > 0) pdf.addPage([A4_WIDTH_PX, A4_HEIGHT_PX], 'portrait');
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX, undefined, 'FAST');

      report(75 + Math.round((pageIndex / totalPages) * 20), `Page ${pageIndex + 1} of ${totalPages}`);
    }

    report(98, 'Finalizing...');
    const blob = pdf.output('blob');

    report(100, 'Done');
    return blob;
  } finally {
    host.remove();
  }
}