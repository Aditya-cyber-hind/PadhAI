import { generateText } from 'ai';
import { mistral, MISTRAL_MODEL } from '@/lib/llm';

/**
 * Pollinations cover image generator.
 *
 * Flow:
 *   1. Mistral writes a short visual prompt from the notebook name
 *   2. We build a Pollinations URL with a deterministic seed
 *   3. Store the URL in the DB — the browser fetches it directly
 *
 * Mistral is used here because it's our idle model. Every other
 * feature leans on Groq. This gives Mistral a purpose and keeps
 * our Groq quota for the heavy lifting.
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

export async function generateCoverPrompt(
  notebookName: string
): Promise<string | null> {
  if (!mistral) {
    console.warn('[covers] mistral not configured, skipping');
    return null;
  }

  try {
    const result = await generateText({
      model: mistral(MISTRAL_MODEL),
      system: SYSTEM_PROMPT,
      prompt: `Notebook: "${notebookName}"\n\nReturn the visual prompt now.`,
      maxRetries: 0,
      maxOutputTokens: 120,
      temperature: 0.7,
    });

    let text = (result.text || '').trim();
    // Strip any quotes the model added
    text = text.replace(/^["'`]+|["'`]+$/g, '').trim();
    // Strip trailing punctuation
    text = text.replace(/[.!?]+$/, '').trim();

    if (!text || text.length < 5 || text.length > 200) {
      console.warn('[covers] prompt rejected:', text);
      return null;
    }

    return text;
  } catch (err) {
    console.error('[covers] prompt generation failed:', err);
    return null;
  }
}

/**
 * Deterministic seed from a string. Same notebook name → same seed →
 * same image on every request.
 */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 1_000_000;
}

export function buildCoverUrl(prompt: string, notebookName: string): string {
  const seed = hashString(notebookName);
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=800&height=500&nologo=true&seed=${seed}`;
}

/**
 * End-to-end: generate prompt via Mistral + return full URL.
 * Returns null on any failure so the caller can skip silently.
 */
export async function generateCoverUrl(
  notebookName: string
): Promise<string | null> {
  const prompt = await generateCoverPrompt(notebookName);
  if (!prompt) return null;
  return buildCoverUrl(prompt, notebookName);
}