import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';

// ============================================================
// Groq (primary — supports browser search)
// ============================================================
if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set in environment variables');
}

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const groqBackup = process.env.GROQ_API_KEY_2
  ? createGroq({ apiKey: process.env.GROQ_API_KEY_2 })
  : null;

export const PADHAI_MODEL = 'openai/gpt-oss-120b';
export const PADHAI_FALLBACK_MODEL = 'openai/gpt-oss-20b';
export const PADHAI_QWEN_MODEL = 'qwen/qwen3.8-27b';

// ============================================================
// Mistral (fallback — no browser search support)
// Uses the native @ai-sdk/mistral provider so it hits the correct
// /v1/chat/completions endpoint instead of OpenAI's /v1/responses.
// ============================================================
export const mistral = process.env.MISTRAL_API_KEY
  ? createMistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null;

export const MISTRAL_MODEL = 'mistral-small-latest';

export function truncateSources(sources: string, maxChars = 12000): string {
  if (!sources) return '';
  if (sources.length <= maxChars) return sources;
  return sources.slice(0, maxChars) + '\n\n[... source truncated ...]';
}