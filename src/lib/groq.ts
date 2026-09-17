import { createGroq } from '@ai-sdk/groq';

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set in environment variables');
}

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const PADHAI_MODEL = 'openai/gpt-oss-120b';

/**
 * Truncate sources to fit within Groq's free-tier 8K TPM limit.
 * ~4 chars per token, leave headroom for the prompt and response.
 */
export function truncateSources(sources: string, maxChars = 12000): string {
  if (!sources) return '';
  if (sources.length <= maxChars) return sources;
  return sources.slice(0, maxChars) + '\n\n[... source truncated ...]';
}