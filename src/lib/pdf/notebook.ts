'use client';

import type { QuizQuestion, Flashcard } from '@/lib/export/types';
import type { MathMap } from '@/lib/export/pdf';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * pdf-lib's built-in fonts (Helvetica, etc.) can only encode Latin-1
 * (bytes 0-255). Any emoji, Hindi, math symbol, or other non-Latin-1
 * character throws "WinAnsi cannot encode" during drawText.
 *
 * This strips those characters and replaces them with a safe placeholder.
 * The output is uglier but the PDF builds.
 *
 * TODO: replace with a proper Unicode font (Noto Sans) via embedFont().
 */
function sanitizeForPdf(text: string): string {
  if (!text) return '';
  // Keep printable ASCII (0x20-0x7E) and Latin-1 extended (0xA0-0xFF).
  // Everything else becomes '?'.
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

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

export async function buildNotebookPdf(input: NotebookPdfInput): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const { data, options, slideImages, onProgress } = input;
  const report = (pct: number, label: string) => onProgress?.(pct, label);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const wrapText = (text: string, size: number, f: any): string[] => {
    const safeText = sanitizeForPdf(text);
    const words = safeText.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (f.widthOfTextAtSize(test, size) <= CONTENT_WIDTH) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const write = (
    text: string,
    size = 11,
    opts: { bold?: boolean; italic?: boolean; color?: [number, number, number]; indent?: number } = {}
  ) => {
    const f = opts.bold ? bold : opts.italic ? italic : font;
    const indent = opts.indent ?? 0;
    const lines = wrapText(text, size, f);
    const color = opts.color ?? [0.1, 0.1, 0.1];
    for (const line of lines) {
      if (y < MARGIN + 40) newPage();
      page.drawText(line, {
        x: MARGIN + indent,
        y,
        size,
        font: f,
        color: rgb(color[0], color[1], color[2]),
      });
      y -= size * 1.4;
    }
  };

  const rule = (color: [number, number, number] = [0.9, 0.9, 0.9]) => {
    if (y < MARGIN + 40) newPage();
    page.drawLine({
      start: { x: MARGIN, y: y - 4 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - 4 },
      thickness: 0.5,
      color: rgb(color[0], color[1], color[2]),
    });
    y -= 12;
  };

  const space = (amount = 12) => {
    y -= amount;
  };

  // ============================================================
  // Cover page
  // ============================================================
  report(5, 'Building cover page');

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 8,
    width: PAGE_WIDTH,
    height: 8,
    color: rgb(0.23, 0.51, 0.96),
  });

  y = PAGE_HEIGHT - MARGIN - 60;

  write(data.notebook.name, 32, { bold: true });
  space(8);

  if (data.notebook.emoji) {
    write(data.notebook.emoji, 40);
    space(10);
  }

  write('PadhAI Notebook Export', 14, {
    italic: true,
    color: [0.5, 0.5, 0.5],
  });
  space(20);

  rule([0.8, 0.8, 0.8]);
  space(8);

  write(
    `Generated ${new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`,
    10,
    { color: [0.5, 0.5, 0.5] }
  );

  space(30);

  write('Contents', 16, { bold: true });
  space(8);

  const contents: string[] = [];
  if (options.sources && data.sources.length > 0)
    contents.push(`Sources — ${data.sources.length} item${data.sources.length === 1 ? '' : 's'}`);
  if (options.chat && data.chat.length > 0)
    contents.push(`Chat transcript — ${data.chat.length} message${data.chat.length === 1 ? '' : 's'}`);
  if (options.quizzes && data.quizzes.length > 0)
    contents.push(`Quizzes — ${data.quizzes.length} deck${data.quizzes.length === 1 ? '' : 's'}`);
  if (options.flashcards && data.flashcards.length > 0)
    contents.push(`Flashcards — ${data.flashcards.length} card${data.flashcards.length === 1 ? '' : 's'}`);
  if (options.slides && slideImages && slideImages.length > 0)
    contents.push(`Slideshow — ${slideImages.length} slides`);

  if (contents.length === 0) {
    write('No sections selected.', 11, { italic: true, color: [0.5, 0.5, 0.5] });
  } else {
    for (const line of contents) {
      write(`• ${line}`, 11);
      space(2);
    }
  }

  // ============================================================
  // Section: Sources
  // ============================================================
  if (options.sources && data.sources.length > 0) {
    report(15, 'Adding sources');
    newPage();
    write('Sources', 24, { bold: true });
    space(6);
    rule([0.23, 0.51, 0.96]);
    space(8);

    for (const s of data.sources) {
      write(s.name, 12, { bold: true });
      const meta = [
        s.type.toUpperCase(),
        s.pageCount > 0 ? `${s.pageCount} page${s.pageCount > 1 ? 's' : ''}` : null,
        `${s.charCount.toLocaleString()} chars`,
        s.method === 'ocr' ? 'OCR' : null,
        new Date(s.createdAt).toLocaleDateString(),
      ]
        .filter(Boolean)
        .join(' · ');
      write(meta, 9, { color: [0.5, 0.5, 0.5] });
      space(10);
    }
  }

  // ============================================================
  // Section: Chat transcript
  // ============================================================
  if (options.chat && data.chat.length > 0) {
    report(30, 'Adding chat transcript');
    newPage();
    write('Chat Transcript', 24, { bold: true });
    space(6);
    rule([0.23, 0.51, 0.96]);
    space(8);

    const messages = filterChat(data.chat, options.chatMode);

    for (const m of messages) {
      const isUser = m.role === 'user';
      write(isUser ? 'You' : 'PadhAI', 10, {
        bold: true,
        color: isUser ? [0.23, 0.51, 0.96] : [0.55, 0.35, 0.9],
      });
      write(m.content, 11);
      space(10);
    }
  }

  // ============================================================
  // Section: Quizzes
  // ============================================================
  if (options.quizzes && data.quizzes.length > 0) {
    report(50, 'Adding quizzes');

    for (const quiz of data.quizzes) {
      newPage();
      write(quiz.title, 20, { bold: true });
      space(4);
      write(
        `${quiz.questions.length} questions · ${quiz.difficulty} · ${new Date(quiz.createdAt).toLocaleDateString()}`,
        10,
        { color: [0.5, 0.5, 0.5] }
      );
      space(6);
      rule([0.23, 0.51, 0.96]);
      space(10);

      for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];
        write(`Q${i + 1}. ${q.question}`, 12, { bold: true });
        space(4);

        for (let j = 0; j < q.options.length; j++) {
          const letter = String.fromCharCode(65 + j);
          const isCorrect = j === q.correctIndex;
          write(`${letter}) ${q.options[j]}`, 11, {
            indent: 16,
            color: isCorrect ? [0.1, 0.6, 0.3] : [0.2, 0.2, 0.2],
          });
        }

        space(4);
        write(`Answer: ${q.options[q.correctIndex]}`, 10, {
          indent: 16,
          italic: true,
          color: [0.1, 0.6, 0.3],
        });
        write(q.explanation, 10, {
          indent: 16,
          italic: true,
          color: [0.4, 0.4, 0.4],
        });
        space(14);
      }
    }
  }

  // ============================================================
  // Section: Flashcards
  // ============================================================
  if (options.flashcards && data.flashcards.length > 0) {
    report(70, 'Adding flashcards');
    newPage();
    write('Flashcards', 24, { bold: true });
    space(6);
    rule([0.23, 0.51, 0.96]);
    space(8);

    for (let i = 0; i < data.flashcards.length; i++) {
      const c = data.flashcards[i];
      write(`${i + 1}. ${c.term}`, 12, { bold: true });
      write(c.definition, 11, { indent: 16 });
      write(`[${c.category} · difficulty ${c.difficulty}/5]`, 9, {
        indent: 16,
        color: [0.5, 0.5, 0.5],
      });
      space(12);
    }
  }

  // ============================================================
  // Section: Slideshow
  // ============================================================
  if (options.slides && slideImages && slideImages.length > 0) {
    report(85, 'Adding slides');

    newPage();
    write(data.notebook.name, 28, { bold: true });
    space(6);
    if (data.slideshow?.subtitle) {
      write(data.slideshow.subtitle, 14, { color: [0.5, 0.5, 0.5] });
    }
    space(20);
    write('Slideshow', 20, { bold: true });
    space(6);
    write(`${slideImages.length} slides`, 11, { color: [0.5, 0.5, 0.5] });

    for (const img of slideImages) {
      const p = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

      const aspect = img.width / img.height;
      const pageAspect = PAGE_WIDTH / PAGE_HEIGHT;
      let w: number, h: number;
      if (aspect > pageAspect) {
        w = PAGE_WIDTH - 40;
        h = w / aspect;
      } else {
        h = PAGE_HEIGHT - 40;
        w = h * aspect;
      }
      const x = (PAGE_WIDTH - w) / 2;
      const yPos = (PAGE_HEIGHT - h) / 2;

      const png = await doc.embedPng(img.dataUrl);
      p.drawImage(png, { x, y: yPos, width: w, height: h });
    }
  }

  // ============================================================
  // Footer page numbers
  // ============================================================
  report(95, 'Finalizing');
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    if (i === 0) continue;
    pages[i].drawText(`${i + 1} / ${pages.length}`, {
      x: PAGE_WIDTH - MARGIN - 40,
      y: 20,
      size: 9,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  report(100, 'Done');
  const bytes = await doc.save();
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
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