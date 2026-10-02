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
  next_review_at: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  created_at: string;
  updated_at: string;
}

export async function listFlashcards(
  notebookId: string,
  userId: string
): Promise<Flashcard[]> {
  const rows = await sql`
    SELECT id, notebook_id, user_id, term, definition, category, difficulty, known,
           next_review_at, interval_days, ease_factor, repetitions,
           created_at, updated_at
    FROM flashcards
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    ORDER BY difficulty ASC, created_at ASC
  `;
  return rows as Flashcard[];
}

/**
 * Cards due for review right now (next_review_at <= now).
 * Ordered by most overdue first.
 */
export async function listDueFlashcards(
  notebookId: string,
  userId: string
): Promise<Flashcard[]> {
  const rows = await sql`
    SELECT id, notebook_id, user_id, term, definition, category, difficulty, known,
           next_review_at, interval_days, ease_factor, repetitions,
           created_at, updated_at
    FROM flashcards
    WHERE notebook_id = ${notebookId}
      AND user_id = ${userId}
      AND next_review_at <= NOW()
    ORDER BY next_review_at ASC
  `;
  return rows as Flashcard[];
}

export interface FlashcardStats {
  total: number;
  due: number;
  new: number;
  scheduled: number;
}

export async function getFlashcardStats(
  notebookId: string,
  userId: string
): Promise<FlashcardStats> {
  const rows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE next_review_at <= NOW())::int AS due,
      COUNT(*) FILTER (WHERE repetitions = 0)::int AS new,
      COUNT(*) FILTER (WHERE next_review_at > NOW())::int AS scheduled
    FROM flashcards
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
  `;
  const r = rows[0] as any;
  return {
    total: r?.total ?? 0,
    due: r?.due ?? 0,
    new: r?.new ?? 0,
    scheduled: r?.scheduled ?? 0,
  };
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
 * Add a single card (dedup by term). Used by Brain Map cross-panel action.
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
  const existing = await sql`
    SELECT id, notebook_id, user_id, term, definition, category, difficulty, known,
           next_review_at, interval_days, ease_factor, repetitions,
           created_at, updated_at
    FROM flashcards
    WHERE notebook_id = ${notebookId} AND user_id = ${userId} AND term = ${card.term}
    LIMIT 1
  `;
  if (existing.length > 0) return existing[0] as Flashcard;

  const rows = await sql`
    INSERT INTO flashcards (notebook_id, user_id, term, definition, category, difficulty)
    VALUES (${notebookId}, ${userId}, ${card.term}, ${card.definition}, ${card.category}, ${card.difficulty})
    RETURNING id, notebook_id, user_id, term, definition, category, difficulty, known,
              next_review_at, interval_days, ease_factor, repetitions,
              created_at, updated_at
  `;
  return (rows[0] as Flashcard) ?? null;
}

/**
 * Legacy: simple known/unknown toggle. Kept for backwards compat.
 */
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

/**
 * SM-2 scheduling update. Called after the user rates a card.
 */
export async function updateFlashcardSchedule(
  cardId: string,
  userId: string,
  next: {
    ease_factor: number;
    interval_days: number;
    repetitions: number;
    next_review_at: Date;
  }
): Promise<boolean> {
  const rows = await sql`
    UPDATE flashcards
    SET
      ease_factor = ${next.ease_factor},
      interval_days = ${next.interval_days},
      repetitions = ${next.repetitions},
      next_review_at = ${next.next_review_at},
      known = ${next.interval_days >= 7},
      updated_at = NOW()
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