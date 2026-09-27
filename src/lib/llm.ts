import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';

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
// OpenAI-compatible API, so we use the OpenAI client with a custom baseURL.
// ============================================================
export const mistral = process.env.MISTRAL_API_KEY
  ? createOpenAI({
      apiKey: process.env.MISTRAL_API_KEY,
      baseURL: 'https://api.mistral.ai/v1',
    })
  : null;

export const MISTRAL_MODEL = 'mistral-small-latest';

export function truncateSources(sources: string, maxChars = 12000): string {
  if (!sources) return '';
  if (sources.length <= maxChars) return sources;
  return sources.slice(0, maxChars) + '\n\n[... source truncated ...]';
}