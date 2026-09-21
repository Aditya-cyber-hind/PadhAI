import { NextRequest } from 'next/server';
import { Index } from '@upstash/vector';
import { chunkText } from '@/lib/rag/chunking';
import { auth } from '@/lib/auth/server';
import { getNotebook, setNotebookEmoji } from '@/lib/notebooks/db';
import { generateEmojiForContent } from '@/lib/notebooks/emoji';
import { addSource } from '@/lib/sources/db';

export const maxDuration = 60;

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { text, sourceName, notebookId, sourceType, pageCount, method } =
      await req.json();

    if (!text || text.trim().length < 50) {
      return Response.json({ error: 'Text too short to ingest' }, { status: 400 });
    }
    if (!sourceName) {
      return Response.json({ error: 'sourceName is required' }, { status: 400 });
    }
    if (!notebookId) {
      return Response.json({ error: 'notebookId is required' }, { status: 400 });
    }

    const chunks = chunkText(text);
    console.log(`[ingest] ${sourceName} (notebook ${notebookId}): ${chunks.length} chunks`);

    if (chunks.length === 0) {
      return Response.json({ error: 'No chunks produced' }, { status: 400 });
    }

    const ns = index.namespace(notebookId);

    try {
      await ns.delete({ filter: `sourceName = '${sourceName}'` });
    } catch {
      console.log(`[ingest] no prior chunks for ${sourceName}`);
    }

    const toUpsert = chunks.map((chunk) => ({
      id: `${sourceName}::${chunk.index}`,
      data: chunk.text,
      metadata: {
        content: chunk.text,
        sourceName,
        chunkIndex: chunk.index,
      },
    }));

    for (let i = 0; i < toUpsert.length; i += 100) {
      await ns.upsert(toUpsert.slice(i, i + 100));
    }

    console.log(`[ingest] stored ${chunks.length} chunks for ${sourceName}`);

    // Persist the source to Postgres so it survives page refresh.
    // Auth is required for this — if there's no session, we skip it
    // (the vectors are still in Upstash, but the source won't show in the UI).
    try {
      const { data: session } = await auth.getSession();
      const userId = session?.user?.id;
      if (userId) {
        await addSource(
          notebookId,
          userId,
          sourceName,
          sourceType ?? 'text',
          text,
          pageCount ?? 0,
          method ?? null
        );
        console.log(`[ingest] saved source to DB: ${sourceName}`);
      }
    } catch (err) {
      console.error('[ingest] failed to persist source to DB:', err);
      // Don't fail the whole request — vectors are already stored
    }

    // Fire-and-forget emoji generation
    void maybeGenerateEmoji(notebookId, text, sourceName);

    return Response.json({ success: true, chunks: chunks.length, sourceName });
  } catch (error) {
    console.error('[ingest] error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Ingestion failed' },
      { status: 500 }
    );
  }
}

async function maybeGenerateEmoji(
  notebookId: string,
  sourceText: string,
  sourceName: string
): Promise<void> {
  try {
    const { data: session } = await auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const notebook = await getNotebook(notebookId, userId);
    if (!notebook) return;

    if (notebook.emoji) return;

    const emoji = await generateEmojiForContent(
      notebook.name,
      `${sourceName}\n\n${sourceText}`
    );
    if (!emoji) return;

    await setNotebookEmoji(notebookId, userId, emoji);
    console.log(`[ingest] emoji set: ${emoji} for notebook ${notebookId}`);
  } catch (err) {
    console.error('[ingest] emoji generation failed:', err);
  }
}