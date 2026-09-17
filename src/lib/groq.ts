import { createGroq } from '@ai-sdk/groq';

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set in environment variables');
}

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const PADHAI_MODEL = 'openai/gpt-oss-120b'; 
