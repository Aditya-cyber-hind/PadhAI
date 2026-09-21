import type { Flashcard } from './types';

export function flashcardsToAnkiCSV(cards: Flashcard[]): string {
  const header = [
    '#separator:Comma',
    '#html:true',
    '#columns:Front,Back,Tags',
  ].join('\n');

  const rows = cards.map((c) => {
    const front = escapeCsvField(c.term);
    const back = escapeCsvField(c.definition);
    const tags = escapeCsvField(`padhai ${c.category}`);
    return `${front},${back},${tags}`;
  });

  return [header, ...rows].join('\n');
}

function escapeCsvField(value: string): string {
  const normalized = value.replace(/\r?\n/g, '<br>').trim();
  if (normalized.includes('"') || normalized.includes(',') || normalized.includes('<br>')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}