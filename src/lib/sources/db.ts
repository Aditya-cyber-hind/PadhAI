import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface Source {
  id: string;
  notebook_id: string;
  user_id: string;
  source_name: string;
  source_type: string;
  text: string;
  char_count: number;
  page_count: number;
  method: string | null;
  created_at: string;
}

export interface SourceMeta {
  id: string;
  notebook_id: string;
  source_name: string;
  source_type: string;
  char_count: number;
  page_count: number;
  method: string | null;
  created_at: string;
}

/**
 * List all sources for a notebook, WITHOUT the full text.
 * The list view doesn't need it — only the citation drawer does.
 */
export async function listSources(
  notebookId: string,
  userId: string
): Promise<SourceMeta[]> {
  const rows = await sql`
    SELECT id, notebook_id, source_name, source_type, char_count, page_count,
           method, created_at
    FROM sources
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows as SourceMeta[];
}

export async function getSource(
  sourceId: string,
  userId: string
): Promise<Source | null> {
  const rows = await sql`
    SELECT id, notebook_id, user_id, source_name, source_type, text,
           char_count, page_count, method, created_at
    FROM sources
    WHERE id = ${sourceId} AND user_id = ${userId}
  `;
  return (rows[0] as Source) ?? null;
}

/**
 * Add or replace a source. Uses ON CONFLICT to handle re-adding the same
 * source_name (e.g. user re-uploads the same PDF). The unique index on
 * (notebook_id, source_name) makes this an upsert.
 */
export async function addSource(
  notebookId: string,
  userId: string,
  sourceName: string,
  sourceType: string,
  text: string,
  pageCount: number,
  method: string | null
): Promise<SourceMeta> {
  const rows = await sql`
    INSERT INTO sources (notebook_id, user_id, source_name, source_type, text,
                         char_count, page_count, method)
    VALUES (${notebookId}, ${userId}, ${sourceName}, ${sourceType}, ${text},
            ${text.length}, ${pageCount}, ${method})
    ON CONFLICT (notebook_id, source_name)
    DO UPDATE SET
      source_type = EXCLUDED.source_type,
      text = EXCLUDED.text,
      char_count = EXCLUDED.char_count,
      page_count = EXCLUDED.page_count,
      method = EXCLUDED.method,
      created_at = NOW()
    RETURNING id, notebook_id, source_name, source_type, char_count,
              page_count, method, created_at
  `;
  return rows[0] as SourceMeta;
}

export async function deleteSource(
  sourceId: string,
  userId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM sources
    WHERE id = ${sourceId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function deleteSourceByName(
  notebookId: string,
  userId: string,
  sourceName: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM sources
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
      AND source_name = ${sourceName}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function clearSources(
  notebookId: string,
  userId: string
): Promise<number> {
  const rows = await sql`
    DELETE FROM sources
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length;
}