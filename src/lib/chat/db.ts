import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export async function loadMessages(
  notebookId: string,
  userId: string
): Promise<StoredMessage[]> {
  const rows = await sql`
    SELECT id, role, content, created_at
    FROM chat_messages
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    ORDER BY created_at ASC
  `;
  return rows as StoredMessage[];
}

export async function saveMessage(
  notebookId: string,
  userId: string,
  role: string,
  content: string
): Promise<void> {
  await sql`
    INSERT INTO chat_messages (notebook_id, user_id, role, content)
    VALUES (${notebookId}, ${userId}, ${role}, ${content})
  `;
}

export async function clearMessages(
  notebookId: string,
  userId: string
): Promise<void> {
  await sql`
    DELETE FROM chat_messages
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
  `;
} 
