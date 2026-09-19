import { createGroq } from '@ai-sdk/groq';

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set in environment variables');
}

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Primary model — smart, but shared 200K/day limit
export const PADHAI_MODEL = 'openai/gpt-oss-120b';

// Fallback model — separate daily quota, still supports browser search
export const PADHAI_FALLBACK_MODEL = 'openai/gpt-oss-20b';

export function truncateSources(sources: string, maxChars = 12000): string {
  if (!sources) return '';
  if (sources.length <= maxChars) return sources;
  return sources.slice(0, maxChars) + '\n\n[... source truncated ...]';
}