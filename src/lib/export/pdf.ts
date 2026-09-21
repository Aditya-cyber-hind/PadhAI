import type { QuizQuestion, Flashcard } from './types';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export interface RenderedMath {
  dataUrl: string;
  width: number;
  height: number;
}

export type MathMap = Record<string, RenderedMath>;

type Run = { type: 'text'; value: string } | { type: 'math'; value: string };

function splitRuns(text: string): Run[] {
  const runs: Run[] = [];
  const re = /\{\{MATH_(\d+)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    runs.push({ type: 'math', value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    runs.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return runs;
}

async function drawRuns(
  page: any,
  runs: Run[],
  x: number,
  yStart: number,
  maxWidth: number,
  font: any,
  size: number,
  mathMap: MathMap,
  pdfDoc: any,
  rgb: any
): Promise<number> {
  const lineHeight = size * 1.4;
  let cursorX = x;
  let cursorY = yStart;

  for (const run of runs) {
    if (run.type === 'text') {
      const words = run.value.split(/(\s+)/);
      for (const word of words) {
        if (word === '') continue;
        if (word === '\n') {
          cursorX = x;
          cursorY -= lineHeight;
          continue;
        }
        const wordWidth = font.widthOfTextAtSize(word, size);
        if (cursorX + wordWidth > x + maxWidth && cursorX > x) {
          cursorX = x;
          cursorY -= lineHeight;
        }
        page.drawText(word, {
          x: cursorX,
          y: cursorY,
          size,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        cursorX += wordWidth;
      }
    } else {
      const keyMatch = run.value.match(/\{\{(MATH_\d+)\}\}/);
      if (!keyMatch) continue;
      const key = keyMatch[1];
      const math = mathMap[key];
      if (!math) continue;

      const targetHeight = size * 1.6;
      const scale = targetHeight / math.height;
      const drawWidth = math.width * scale;
      const drawHeight = math.height * scale;

      if (cursorX + drawWidth > x + maxWidth && cursorX > x) {
        cursorX = x;
        cursorY -= lineHeight;
      }

      const png = await pdfDoc.embedPng(math.dataUrl);
      page.drawImage(png, {
        x: cursorX,
        y: cursorY - (drawHeight - size) / 2,
        width: drawWidth,
        height: drawHeight,
      });
      cursorX += drawWidth + 4;
    }
  }

  return cursorY - lineHeight;
}

export async function quizToPdf(
  questions: QuizQuestion[],
  meta: { title: string },
  mathMap: MathMap
): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const write = async (text: string, size = 11, useBold = false) => {
    const f = useBold ? bold : font;
    const runs = splitRuns(text);
    y = await drawRuns(page, runs, MARGIN, y, CONTENT_WIDTH, f, size, mathMap, doc, rgb);
    if (y < MARGIN + 60) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  await write(meta.title + ' — Quiz', 18, true);
  y -= 6;
  await write(new Date().toLocaleString(), 9);
  y -= 12;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    y -= 4;
    await write(`Q${i + 1}. ${q.question}`, 12, true);
    for (let j = 0; j < q.options.length; j++) {
      const letter = String.fromCharCode(65 + j);
      await write(`   ${letter}) ${q.options[j]}`, 11);
    }
    y -= 6;
  }

  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - MARGIN;
  await write('Answer Key', 16, true);
  y -= 8;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const letter = String.fromCharCode(65 + q.correctIndex);
    await write(`Q${i + 1}: ${letter} — ${q.options[q.correctIndex]}`, 11);
    await write(`     ${q.explanation}`, 9);
    y -= 4;
  }

  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function flashcardsToPdf(
  cards: Flashcard[],
  meta: { title: string },
  mathMap: MathMap
): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const write = async (text: string, size = 11, useBold = false) => {
    const f = useBold ? bold : font;
    const runs = splitRuns(text);
    y = await drawRuns(page, runs, MARGIN, y, CONTENT_WIDTH, f, size, mathMap, doc, rgb);
    if (y < MARGIN + 60) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  await write(meta.title + ' — Flashcards', 18, true);
  y -= 6;
  await write(`${cards.length} cards · ${new Date().toLocaleString()}`, 9);
  y -= 12;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    y -= 4;
    await write(`${i + 1}. ${c.term}`, 12, true);
    await write(`   [${c.category} · diff ${c.difficulty}/5]`, 9);
    await write(c.definition, 11);
    y -= 6;
  }

  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}