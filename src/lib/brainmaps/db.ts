import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export type BrainMapNodeType =
  | 'concept'
  | 'formula'
  | 'process'
  | 'term'
  | 'person'
  | 'event';

export interface BrainMapNode {
  id: string;
  label: string;
  type: BrainMapNodeType;
  importance: number;
  summary: string;
  sourceRefs?: string[];
}

export interface BrainMapEdge {
  source: string;
  target: string;
  label: string;
  strength: number;
}

export interface BrainMap {
  id: string;
  notebook_id: string;
  nodes: BrainMapNode[];
  edges: BrainMapEdge[];
  created_at: string;
  updated_at: string;
}

export async function getBrainMap(
  notebookId: string,
  userId: string
): Promise<BrainMap | null> {
  const rows = await sql`
    SELECT id, notebook_id, nodes, edges, created_at, updated_at
    FROM brainmaps
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as any;
  return {
    id: r.id,
    notebook_id: r.notebook_id,
    nodes: Array.isArray(r.nodes) ? r.nodes : [],
    edges: Array.isArray(r.edges) ? r.edges : [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function saveBrainMap(
  notebookId: string,
  userId: string,
  nodes: BrainMapNode[],
  edges: BrainMapEdge[]
): Promise<void> {
  await sql`
    INSERT INTO brainmaps (notebook_id, user_id, nodes, edges)
    VALUES (${notebookId}, ${userId}, ${JSON.stringify(nodes)}::jsonb, ${JSON.stringify(edges)}::jsonb)
    ON CONFLICT (notebook_id, user_id)
    DO UPDATE SET
      nodes = EXCLUDED.nodes,
      edges = EXCLUDED.edges,
      updated_at = NOW()
  `;
}

export async function clearBrainMap(
  notebookId: string,
  userId: string
): Promise<void> {
  await sql`
    DELETE FROM brainmaps
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
  `;
}