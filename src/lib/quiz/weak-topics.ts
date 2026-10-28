import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface WeakTopic {
  topic: string;
  wrong: number;
  total: number;
  accuracy_pct: number;
}

export interface NotebookWeakTopics {
  notebook_id: string;
  notebook_name: string;
  notebook_emoji: string | null;
  topics: WeakTopic[];
}

/**
 * Aggregates wrong answers by topic across ALL quiz attempts
 * for the given notebook (or all notebooks if notebookId is null).
 *
 * Only topics with ≥ 3 total attempts are considered, so one-off
 * wrong answers on a rarely-quizzed topic don't dominate.
 * Only topics with < 70% accuracy surface as "weak".
 */
export async function getWeakTopics(
  userId: string,
  notebookId?: string | null
): Promise<NotebookWeakTopics[]> {
  const rows = await sql`
    WITH attempts_by_topic AS (
      SELECT
        q.notebook_id,
        qq.topic,
        COUNT(*) FILTER (WHERE qa.is_correct = false)::int AS wrong,
        COUNT(*)::int AS total
      FROM quiz_answers qa
      JOIN quiz_attempts att ON att.id = qa.attempt_id
      JOIN quiz_questions qq ON qq.id = qa.question_id
      JOIN quizzes q ON q.id = att.quiz_id
      WHERE att.user_id = ${userId}
        AND qq.topic IS NOT NULL
        AND length(trim(qq.topic)) > 0
        ${notebookId ? sql`AND q.notebook_id = ${notebookId}` : sql``}
      GROUP BY q.notebook_id, qq.topic
    ),
    weak AS (
      SELECT
        notebook_id,
        topic,
        wrong,
        total,
        ROUND(100.0 * (total - wrong) / NULLIF(total, 0), 0)::int AS accuracy_pct
      FROM attempts_by_topic
      WHERE total >= 3
        AND (100.0 * (total - wrong) / total) < 70
    )
    SELECT
      w.notebook_id,
      n.name AS notebook_name,
      n.emoji AS notebook_emoji,
      w.topic,
      w.wrong,
      w.total,
      w.accuracy_pct
    FROM weak w
    JOIN notebooks n ON n.id = w.notebook_id
    WHERE n.user_id = ${userId}
    ORDER BY w.notebook_id, w.accuracy_pct ASC, w.total DESC
  `;

  // Group flat rows into per-notebook buckets
  const byNotebook = new Map<string, NotebookWeakTopics>();
  for (const r of rows as Array<{
    notebook_id: string;
    notebook_name: string;
    notebook_emoji: string | null;
    topic: string;
    wrong: number;
    total: number;
    accuracy_pct: number;
  }>) {
    if (!byNotebook.has(r.notebook_id)) {
      byNotebook.set(r.notebook_id, {
        notebook_id: r.notebook_id,
        notebook_name: r.notebook_name,
        notebook_emoji: r.notebook_emoji,
        topics: [],
      });
    }
    byNotebook.get(r.notebook_id)!.topics.push({
      topic: r.topic,
      wrong: r.wrong,
      total: r.total,
      accuracy_pct: r.accuracy_pct,
    });
  }

  // Return notebooks with at least one weak topic, capped at 3 topics per notebook
  return Array.from(byNotebook.values())
    .map((nb) => ({ ...nb, topics: nb.topics.slice(0, 3) }))
    .filter((nb) => nb.topics.length > 0);
}