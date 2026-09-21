import { neon } from '@neondatabase/serverless';

export interface Notebook {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  created_at: string;
  updated_at: string;
}

const sql = neon(process.env.DATABASE_URL!);

export async function listNotebooks(userId: string): Promise<Notebook[]> {
  const rows = await sql`
    SELECT id, user_id, name, emoji, created_at, updated_at
    FROM notebooks
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return rows as Notebook[];
}

export async function countNotebooks(userId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM notebooks WHERE user_id = ${userId}
  `;
  return (rows[0] as { count: number }).count;
}

export async function createNotebook(userId: string, name: string): Promise<Notebook> {
  const rows = await sql`
    INSERT INTO notebooks (user_id, name)
    VALUES (${userId}, ${name})
    RETURNING id, user_id, name, emoji, created_at, updated_at
  `;
  return rows[0] as Notebook;
}

export async function getNotebook(id: string, userId: string): Promise<Notebook | null> {
  const rows = await sql`
    SELECT id, user_id, name, emoji, created_at, updated_at
    FROM notebooks
    WHERE id = ${id} AND user_id = ${userId}
  `;
  return (rows[0] as Notebook) ?? null;
}

export async function renameNotebook(
  id: string,
  userId: string,
  name: string
): Promise<Notebook | null> {
  const rows = await sql`
    UPDATE notebooks
    SET name = ${name}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, user_id, name, emoji, created_at, updated_at
  `;
  return (rows[0] as Notebook) ?? null;
}

export async function deleteNotebook(id: string, userId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM notebooks
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function setNotebookEmoji(
  id: string,
  userId: string,
  emoji: string
): Promise<void> {
  await sql`
    UPDATE notebooks
    SET emoji = ${emoji}
    WHERE id = ${id} AND user_id = ${userId}
  `;
}