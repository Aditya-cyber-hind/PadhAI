export interface Chunk {
  text: string;
  index: number;
}

const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 300;

export function chunkText(text: string): Chunk[] {
  if (!text || text.trim().length === 0) return [];

  const chunks: Chunk[] = [];
  const separators = ['\n\n', '\n', '. ', ' ', ''];

  let currentIndex = 0;
  let textIndex = 0;

  while (textIndex < text.length) {
    let end = Math.min(textIndex + CHUNK_SIZE, text.length);
    let splitAt = end;

    if (end < text.length) {
      for (const sep of separators) {
        if (sep === '') break;
        const lastSep = text.lastIndexOf(sep, end);
        if (lastSep > textIndex + CHUNK_SIZE * 0.5) {
          splitAt = lastSep + sep.length;
          break;
        }
      }
    }

    const chunkText = text.slice(textIndex, splitAt).trim();
    if (chunkText.length > 0) {
      chunks.push({ text: chunkText, index: currentIndex });
      currentIndex++;
    }

    if (splitAt >= text.length) break;
    textIndex = splitAt - CHUNK_OVERLAP;
  }

  return chunks;
} 
