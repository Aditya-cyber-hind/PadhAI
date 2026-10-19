import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface FolderWithCount extends Folder {
  notebook_count: number;
}

export async function listFolders(userId: string): Promise<FolderWithCount[]> {
  const rows = await sql`
    SELECT f.id, f.user_id, f.name, f.color, f.created_at,
           COALESCE(COUNT(n.id), 0)::int AS notebook_count
    FROM folders f
    LEFT JOIN notebooks n ON n.folder_id = f.id AND n.user_id = f.user_id
    WHERE f.user_id = ${userId}
    GROUP BY f.id
    ORDER BY f.created_at ASC
  `;
  return rows as FolderWithCount[];
}

export async function createFolder(
  userId: string,
  name: string,
  color?: string | null
): Promise<Folder> {
  const rows = await sql`
    INSERT INTO folders (user_id, name, color)
    VALUES (${userId}, ${name}, ${color ?? null})
    RETURNING id, user_id, name, color, created_at
  `;
  return rows[0] as Folder;
}

export async function updateFolder(
  folderId: string,
  userId: string,
  patch: { name?: string; color?: string | null }
): Promise<Folder | null> {
  const rows = await sql`
    UPDATE folders
    SET
      name  = COALESCE(${patch.name ?? null}, name),
      color = CASE WHEN ${patch.color !== undefined} THEN ${patch.color ?? null} ELSE color END
    WHERE id = ${folderId} AND user_id = ${userId}
    RETURNING id, user_id, name, color, created_at
  `;
  return (rows[0] as Folder) ?? null;
}

export async function deleteFolder(
  folderId: string,
  userId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM folders
    WHERE id = ${folderId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function moveNotebookToFolder(
  notebookId: string,
  userId: string,
  folderId: string | null
): Promise<boolean> {
  if (folderId !== null) {
    const ok = await sql`
      SELECT id FROM folders WHERE id = ${folderId} AND user_id = ${userId}
    `;
    if (ok.length === 0) return false;
  }
  const rows = await sql`
    UPDATE notebooks
    SET folder_id = ${folderId}, updated_at = NOW()
    WHERE id = ${notebookId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}