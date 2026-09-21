/**
 * Normalize every citation format a model might hallucinate into plain [N].
 *
 * Models are trained on data from many platforms, so when told to "cite sources"
 * they sometimes produce formats from other systems:
 *
 *   - Google/Gemini:    【2†L8-L13】  or  【2】  or  [2†L8]
 *   - Bing/Copilot:     [^1^]  or  [citation needed]
 *   - NotebookLM:       【source 2†L8-L13】
 *   - Plain language:   (source 2)  or  [Source 2]
 *   - Unicode brackets: 〔2〕  or  〖2〗
 *
 * This function collapses all of them to [N]. It runs on the server BEFORE
 * the model's output is streamed back, so the client only ever sees clean
 * markers and the pill-rendering regex doesn't have to know about any of them.
 *
 * This is lossy — the line numbers from 【2†L8-L13】 are discarded. That's
 * intentional: the client resolves citations against a list of chunks, and
 * the chunk numbers already identify the exact region. Line numbers would
 * be redundant and inconsistent across formats.
 */
export function sanitizeCitations(text: string): string {
  let out = text;

  // 1. Google/Gemini style with line range: 【2†L8-L13】 or 【2†L8】 or 【2】
  out = out.replace(/【\s*(\d+)(?:†[^】]*)】/g, '[$1]');

  // 2. Google/Gemini style with † but no 【】 — sometimes the brackets get lost
  //    e.g. [2†L8-L13] → [2]
  out = out.replace(/\[\s*(\d+)\s*†[^\]]*\]/g, '[$1]');

  // 3. Square brackets with "source" prefix: [Source 2] or [source 2] or [src 2]
  out = out.replace(/\[\s*(?:source|src)\s*(\d+)\s*\]/gi, '[$1]');

  // 4. Parentheses with "source" prefix: (source 2) or (Source 2)
  out = out.replace(/\(\s*(?:source|src)\s*(\d+)\s*\)/gi, '[$1]');

  // 5. Plain parentheses with just a number: (2)
  //    Careful — this could match legitimate parenthetical numbers like "(1)"
  //    in "step (1)". Only converts when surrounded by sentence boundaries.
  out = out.replace(/([.!?]\s*)\((\d{1,2})\)/g, '$1[$2]');

  // 6. Unicode brackets: 〔2〕 or 〖2〗 or ［2］ (fullwidth)
  out = out.replace(/[〔〖［]\s*(\d+)\s*[〕〗］]/g, '[$1]');

  // 7. Bing/Copilot style: [^2^] → [2]
  out = out.replace(/\[\^(\d+)\^\]/g, '[$1]');

  // 8. Multiple sources in a row with separators: [1, 3] or [1;3] → [1][3]
  //    The pill renderer expects back-to-back [N][N].
  out = out.replace(/\[\s*(\d+)\s*[,;]\s*(\d+)\s*\]/g, '[$1][$2]');

  // 9. Normalize whitespace around citation markers — ensure exactly one space
  //    before the marker, and no space after (so word[1] stays word [1])
  out = out.replace(/\s*\[(\d+)\]/g, ' [$1]');

  return out;
}