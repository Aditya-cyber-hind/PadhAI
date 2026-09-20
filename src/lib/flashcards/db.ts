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
  // Delete existing cards for this notebook
  await sql`
    DELETE FROM flashcards
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
  `;

  // Insert new ones
  for (const c of cards) {
    await sql`
      INSERT INTO flashcards (notebook_id, user_id, term, definition, category, difficulty)
      VALUES (${notebookId}, ${userId}, ${c.term}, ${c.definition}, ${c.category}, ${c.difficulty})
    `;
  }
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
