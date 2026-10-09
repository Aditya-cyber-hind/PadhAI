import { neon } from '@neondatabase/serverless';

export interface Notebook {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  cover_image_url: string | null;
  notebook_type: 'study' | 'coding';
  custom_instructions: string | null;
  created_at: string;
  updated_at: string;
}

const sql = neon(process.env.DATABASE_URL!);

export async function listNotebooks(userId: string): Promise<Notebook[]> {
  const rows = await sql`
    SELECT id, user_id, name, emoji, cover_image_url,
           COALESCE(notebook_type, 'study') AS notebook_type,
           custom_instructions,
           created_at, updated_at
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

export async function createNotebook(
  userId: string,
  name: string,
  notebookType: 'study' | 'coding' = 'study'
): Promise<Notebook> {
  const rows = await sql`
    INSERT INTO notebooks (user_id, name, notebook_type)
    VALUES (${userId}, ${name}, ${notebookType})
    RETURNING id, user_id, name, emoji, cover_image_url,
              COALESCE(notebook_type, 'study') AS notebook_type,
              custom_instructions,
              created_at, updated_at
  `;
  return rows[0] as Notebook;
}

export async function getNotebook(id: string, userId: string): Promise<Notebook | null> {
  const rows = await sql`
    SELECT id, user_id, name, emoji, cover_image_url,
           COALESCE(notebook_type, 'study') AS notebook_type,
           custom_instructions,
           created_at, updated_at
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
    RETURNING id, user_id, name, emoji, cover_image_url,
              COALESCE(notebook_type, 'study') AS notebook_type,
              custom_instructions,
              created_at, updated_at
  `;
  return (rows[0] as Notebook) ?? null;
}

export async function updateNotebookSettings(
  id: string,
  userId: string,
  updates: {
    name?: string;
    custom_instructions?: string | null;
  }
): Promise<Notebook | null> {
  const current = await getNotebook(id, userId);
  if (!current) return null;

  const newName = updates.name !== undefined ? updates.name : current.name;
  const newInstructions =
    updates.custom_instructions !== undefined
      ? updates.custom_instructions
      : current.custom_instructions;

  const rows = await sql`
    UPDATE notebooks
    SET name = ${newName},
        custom_instructions = ${newInstructions},
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, user_id, name, emoji, cover_image_url,
              COALESCE(notebook_type, 'study') AS notebook_type,
              custom_instructions,
              created_at, updated_at
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

export async function setNotebookCover(
  id: string,
  userId: string,
  coverImageUrl: string
): Promise<void> {
  await sql`
    UPDATE notebooks
    SET cover_image_url = ${coverImageUrl}
    WHERE id = ${id} AND user_id = ${userId}
  `;
}