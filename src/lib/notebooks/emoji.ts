import { generateText } from 'ai';
import { groq, PADHAI_FALLBACK_MODEL } from '@/lib/groq';

/**
 * Ask the LLM for a single emoji that represents the notebook content.
 * Returns null on failure — caller should leave emoji unchanged.
 */
export async function generateEmojiForContent(
  notebookName: string,
  sampleText: string
): Promise<string | null> {
  try {
    const sample = sampleText.slice(0, 2000).trim();
    if (!sample) return null;

    const { text } = await generateText({
      model: groq(PADHAI_FALLBACK_MODEL),
      prompt: `You choose ONE emoji to represent a study notebook.

Notebook name: "${notebookName}"
Content sample: "${sample}"

Rules:
- Reply with EXACTLY ONE emoji character, nothing else.
- No text, no explanation, no punctuation.
- Pick something specific and memorable (e.g. ⚛️ for physics, 🧬 for biology, 📜 for history, 💰 for finance).
- Avoid generic ones like 📓 📚 📝 unless the content truly has no theme.

Reply with the emoji now:`,
      temperature: 0.7,
    });

    const emoji = extractFirstEmoji(text);
    return emoji;
  } catch (err) {
    console.error('[emoji] generation failed:', err);
    return null;
  }
}

/**
 * Pull the first emoji out of an LLM response.
 * LLMs sometimes wrap it in quotes or add words — we just want the emoji.
 */
function extractFirstEmoji(text: string): string | null {
  const cleaned = text.trim();
  if (!cleaned) return null;

  // Unicode emoji regex — matches most emoji including ZWJ sequences
  const match = cleaned.match(
    /\p{Extended_Pictographic}(\u200D\p{Extended_Pictographic})*/u
  );
  return match ? match[0] : null;
}