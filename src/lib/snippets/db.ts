import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface Snippet {
  id: string;
  notebook_id: string;
  user_id: string;
  language: string;
  filename: string | null;
  code: string;
  explanation: string | null;
  created_at: string;
}

export async function listSnippets(
  notebookId: string,
  userId: string
): Promise<Snippet[]> {
  const rows = await sql`
    SELECT id, notebook_id, user_id, language, filename, code, explanation, created_at
    FROM snippets
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows as Snippet[];
}

export async function saveSnippet(
  notebookId: string,
  userId: string,
  language: string,
  filename: string | null,
  code: string,
  explanation: string | null
): Promise<Snippet> {
  // Skip duplicates — same code + language for same notebook
  const existing = await sql`
    SELECT id FROM snippets
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
      AND language = ${language} AND code = ${code}
    LIMIT 1
  `;
  if (existing.length > 0) {
    const rows = await sql`
      SELECT id, notebook_id, user_id, language, filename, code, explanation, created_at
      FROM snippets WHERE id = ${(existing[0] as { id: string }).id}
    `;
    return rows[0] as Snippet;
  }

  const rows = await sql`
    INSERT INTO snippets (notebook_id, user_id, language, filename, code, explanation)
    VALUES (${notebookId}, ${userId}, ${language}, ${filename}, ${code}, ${explanation})
    RETURNING id, notebook_id, user_id, language, filename, code, explanation, created_at
  `;
  return rows[0] as Snippet;
}

export async function deleteSnippet(
  snippetId: string,
  userId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM snippets
    WHERE id = ${snippetId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}