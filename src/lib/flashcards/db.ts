import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface Flashcard {
  id: string;
  notebook_id: string;
  user_id: string;
  term: string;
  definition: string;
  category: string;
  difficulty: number;
  known: boolean;
  created_at: string;
  updated_at: string;
}

export async function listFlashcards(
  notebookId: string,
  userId: string
): Promise<Flashcard[]> {
  const rows = await sql`
    SELECT id, notebook_id, user_id, term, definition, category, difficulty, known, created_at, updated_at
    FROM flashcards
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    ORDER BY difficulty ASC, created_at ASC
  `;
  return rows as Flashcard[];
}

export async function replaceFlashcards(
  notebookId: string,
  userId: string,
  cards: Array<{
    term: string;
    definition: string;
    category: string;
    difficulty: number;
  }>
): Promise<void> {
  await sql`
    DELETE FROM flashcards
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
  `;

  for (const c of cards) {
    await sql`
      INSERT INTO flashcards (notebook_id, user_id, term, definition, category, difficulty)
      VALUES (${notebookId}, ${userId}, ${c.term}, ${c.definition}, ${c.category}, ${c.difficulty})
    `;
  }
}

/**
 * Add a SINGLE flashcard to an existing deck (append, doesn't replace).
 * Dedupes on (notebook, user, term) so clicking twice doesn't insert twice.
 * Returns the new card, or the existing one if it was already present.
 */
export async function createSingleFlashcard(
  notebookId: string,
  userId: string,
  card: {
    term: string;
    definition: string;
    category: string;
    difficulty: number;
  }
): Promise<Flashcard | null> {
  // Look for an existing card with the same term in this notebook
  const existing = await sql`
    SELECT id, notebook_id, user_id, term, definition, category, difficulty, known, created_at, updated_at
    FROM flashcards
    WHERE notebook_id = ${notebookId} AND user_id = ${userId} AND term = ${card.term}
    LIMIT 1
  `;
  if (existing.length > 0) {
    return existing[0] as Flashcard;
  }

  const rows = await sql`
    INSERT INTO flashcards (notebook_id, user_id, term, definition, category, difficulty)
    VALUES (${notebookId}, ${userId}, ${card.term}, ${card.definition}, ${card.category}, ${card.difficulty})
    RETURNING id, notebook_id, user_id, term, definition, category, difficulty, known, created_at, updated_at
  `;
  return (rows[0] as Flashcard) ?? null;
}

export async function setCardKnown(
  cardId: string,
  userId: string,
  known: boolean
): Promise<boolean> {
  const rows = await sql`
    UPDATE flashcards
    SET known = ${known}, updated_at = NOW()
    WHERE id = ${cardId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function clearFlashcards(
  notebookId: string,
  userId: string
): Promise<void> {
  await sql`
    DELETE FROM flashcards
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
  `;
}