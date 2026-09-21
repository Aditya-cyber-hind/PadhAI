'use client';

import html2canvas from 'html2canvas-pro';

export interface MathSegment {
  latex: string;
  displayMode: boolean;
}

export function extractMath(input: string): {
  text: string;
  segments: MathSegment[];
} {
  const segments: MathSegment[] = [];
  let result = '';
  let i = 0;

  while (i < input.length) {
    if (input[i] === '$' && input[i + 1] === '$') {
      const end = input.indexOf('$$', i + 2);
      if (end === -1) {
        result += input.slice(i);
        break;
      }
      const latex = input.slice(i + 2, end).trim();
      const token = `{{MATH_${segments.length}}}`;
      segments.push({ latex, displayMode: true });
      result += token;
      i = end + 2;
      continue;
    }

    if (input[i] === '$' && input[i + 1] !== '$') {
      const end = input.indexOf('$', i + 1);
      if (end === -1 || end === i + 1) {
        result += input[i];
        i += 1;
        continue;
      }
      const latex = input.slice(i + 1, end).trim();
      const token = `{{MATH_${segments.length}}}`;
      segments.push({ latex, displayMode: false });
      result += token;
      i = end + 1;
      continue;
    }

    result += input[i];
    i += 1;
  }

  return { text: result, segments };
}

export async function renderLatexToPng(
  latex: string,
  displayMode: boolean,
  fontSize = 16
): Promise<{ dataUrl: string; width: number; height: number }> {
  const katex = (await import('katex')).default;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.fontSize = `${fontSize}px`;
  container.style.background = 'white';
  container.style.padding = '4px 8px';
  container.style.display = 'inline-block';
  container.style.zIndex = '-1';

  katex.render(latex, container, {
    displayMode,
    throwOnError: false,
    output: 'html',
  });

  document.body.appendChild(container);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: 'white',
      logging: false,
      useCORS: true,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const rect = container.getBoundingClientRect();

    return {
      dataUrl,
      width: rect.width,
      height: rect.height,
    };
  } finally {
    document.body.removeChild(container);
  }
}