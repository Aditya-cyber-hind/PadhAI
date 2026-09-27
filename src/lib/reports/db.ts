import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface Report {
  id: string;
  notebook_id: string;
  title: string;
  markdown: string;
  created_at: string;
  updated_at: string;
}

export async function getReport(
  notebookId: string,
  userId: string
): Promise<Report | null> {
  const rows = await sql`
    SELECT id, notebook_id, title, markdown, created_at, updated_at
    FROM reports
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rows[0] as Report;
}

export async function saveReport(
  notebookId: string,
  userId: string,
  title: string,
  markdown: string
): Promise<void> {
  await sql`
    INSERT INTO reports (notebook_id, user_id, title, markdown)
    VALUES (${notebookId}, ${userId}, ${title}, ${markdown})
    ON CONFLICT (notebook_id, user_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      markdown = EXCLUDED.markdown,
      updated_at = NOW()
  `;
}

export async function clearReport(
  notebookId: string,
  userId: string
): Promise<void> {
  await sql`
    DELETE FROM reports
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
  `;
}