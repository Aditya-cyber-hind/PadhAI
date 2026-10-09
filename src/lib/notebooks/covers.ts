import { generateText } from 'ai';
import { groq, PADHAI_FALLBACK_MODEL } from '@/lib/llm';

/**
 * Pollinations cover image generator.
 *
 * Flow:
 *   1. LLM writes a short visual prompt from the notebook name
 *   2. We build a Pollinations URL with a deterministic seed
 *   3. Store the URL in the DB — the browser fetches it directly
 *
 * Uses Groq (20b). Tokens are set generously to leave room for
 * reasoning without cutting off the output.
 *
 * If the LLM fails to return a usable prompt, we fall back to a
 * fixed template so a cover is always generated.
 */

const SYSTEM_PROMPT = `You write short visual prompts for abstract cover images.

RULES:
- Output ONLY the prompt text. No quotes, no explanation, no markdown.
- Keep it under 20 words.
- ALWAYS end with: no text, no words, no letters
- Use abstract, geometric, minimal, or watercolor styles.
- Never photorealistic. Never people. Never text.
- Palette: warm amber, deep stone, cream, soft orange.
- If the notebook name is about a real concept, evoke it with colors,
  shapes, and materials — not literal illustrations.`;

/**
 * Fixed template used as a fallback when the LLM returns nothing usable.
 * The notebook name is ALWAYS appended so the resulting prompt is unique
 * per notebook — this is what stops Pollinations from serving a cached
 * identical image for every notebook.
 */
function buildTemplatePrompt(notebookName: string): string {
  const safeName = notebookName
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // keep letters/numbers/space/dash
    .slice(0, 40);
  return `abstract soft geometric shapes inspired by ${safeName}, warm amber and stone tones, minimal composition, no text no words no letters`;
}

export async function generateCoverPrompt(
  notebookName: string
): Promise<string> {
  try {
    const result = await generateText({
      model: groq(PADHAI_FALLBACK_MODEL),
      system: SYSTEM_PROMPT,
      prompt: `Notebook name: "${notebookName}"\n\nReply with the visual prompt in plain text, nothing else:`,
      maxRetries: 0,
      maxOutputTokens: 500,
      temperature: 0.8,
    });

    let text = (result.text || '').trim();
    text = text.replace(/^["'`]+|["'`]+$/g, '').trim();
    text = text.replace(/[.!?]+$/, '').trim();
    text = text.replace(/\s+/g, ' ').trim();

    if (!text || text.length < 5 || text.length > 200) {
      console.warn(
        '[covers] prompt rejected. Length:',
        text.length,
        'Raw:',
        JSON.stringify(text.slice(0, 200))
      );
      return buildTemplatePrompt(notebookName);
    }

    // Ensure the notebook name is part of the prompt so the resulting
    // image is uniquely tied to this notebook even if the LLM returns
    // something generic.
    const nameLower = notebookName.toLowerCase().trim();
    const promptLower = text.toLowerCase();
    if (nameLower && !promptLower.includes(nameLower) && text.length < 150) {
      text = `${text}, inspired by ${notebookName}`;
    }

    return text;
  } catch (err) {
    console.error('[covers] prompt generation failed:', err);
    return buildTemplatePrompt(notebookName);
  }
}

/**
 * Deterministic seed from a string. Same notebook name → same seed →
 * same image on every request (for a given prompt).
 */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 1_000_000_000;
}

export function buildCoverUrl(prompt: string, notebookName: string): string {
  const seed = hashString(notebookName);
  const encoded = encodeURIComponent(prompt);
  // seed FIRST — Pollinations' CDN has been observed to key on the
  // parameter order. Putting seed right after ? guarantees a unique
  // cache key per notebook.
  return `https://image.pollinations.ai/prompt/${encoded}?seed=${seed}&width=800&height=500&nologo=true`;
}

/**
 * End-to-end: generate prompt + return full URL.
 * Never returns null — always falls back to the template.
 */
export async function generateCoverUrl(
  notebookName: string
): Promise<string> {
  const prompt = await generateCoverPrompt(notebookName);
  return buildCoverUrl(prompt, notebookName);
}