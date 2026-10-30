import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

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
// Gemini (fallback — no browser search support)
// Uses the native @ai-sdk/google provider.
// ============================================================
export const gemini = process.env.GEMINI_API_KEY
  ? createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

export const GEMINI_MODEL = 'gemini-2.5-flash';

export function truncateSources(sources: string, maxChars = 12000): string {
  if (!sources) return '';
  if (sources.length <= maxChars) return sources;
  return sources.slice(0, maxChars) + '\n\n[... source truncated ...]';
}