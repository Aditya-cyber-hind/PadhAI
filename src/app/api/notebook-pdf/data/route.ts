import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getNotebook } from '@/lib/notebooks/db';
import { listSources } from '@/lib/sources/db';
import { getSlideshow } from '@/lib/slideshow/db';
import { neon } from '@neondatabase/serverless';

export const maxDuration = 30;

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notebookId = req.nextUrl.searchParams.get('notebookId');
  if (!notebookId) {
    return Response.json({ error: 'notebookId required' }, { status: 400 });
  }

  try {
    const notebook = await getNotebook(notebookId, userId);
    if (!notebook) {
      return Response.json({ error: 'Notebook not found' }, { status: 404 });
    }

    // Fetch everything in parallel
    const [sources, chatRows, quizRows, questionRows, flashcardRows, slideshow] =
      await Promise.all([
        listSources(notebookId, userId),

        sql`
          SELECT id, role, content, created_at
          FROM chat_messages
          WHERE notebook_id = ${notebookId}
          ORDER BY created_at ASC
        `,

        sql`
          SELECT id, title, difficulty, question_count, created_at
          FROM quizzes
          WHERE notebook_id = ${notebookId} AND user_id = ${userId}
          ORDER BY created_at ASC
        `,

        sql`
          SELECT qq.quiz_id, qq.question, qq.options, qq.correct_index,
                 qq.explanation, qq.position
          FROM quiz_questions qq
          JOIN quizzes q ON q.id = qq.quiz_id
          WHERE q.notebook_id = ${notebookId} AND q.user_id = ${userId}
          ORDER BY qq.quiz_id, qq.position ASC
        `,

        sql`
          SELECT id, term, definition, category, difficulty, known, created_at
          FROM flashcards
          WHERE notebook_id = ${notebookId} AND user_id = ${userId}
          ORDER BY difficulty ASC, created_at ASC
        `,

        getSlideshow(notebookId, userId).catch(() => null),
      ]);

    // Group questions by quiz_id
    const questionsByQuiz: Record<string, any[]> = {};
    for (const row of questionRows as any[]) {
      if (!questionsByQuiz[row.quiz_id]) questionsByQuiz[row.quiz_id] = [];
      questionsByQuiz[row.quiz_id].push({
        question: row.question,
        options: row.options,
        correctIndex: row.correct_index,
        explanation: row.explanation,
      });
    }

    const quizzes = (quizRows as any[]).map((q) => ({
      id: q.id,
      title: q.title,
      difficulty: q.difficulty,
      questionCount: q.question_count,
      createdAt: q.created_at,
      questions: questionsByQuiz[q.id] || [],
    }));

    return Response.json({
      notebook: {
        id: notebook.id,
        name: notebook.name,
        emoji: notebook.emoji,
        createdAt: notebook.created_at,
      },
      sources: (sources as any[]).map((s) => ({
        id: s.id,
        name: s.source_name,
        type: s.source_type,
        charCount: s.char_count,
        pageCount: s.page_count,
        method: s.method,
        createdAt: s.created_at,
      })),
      chat: (chatRows as any[]).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      })),
      quizzes,
      flashcards: (flashcardRows as any[]).map((f) => ({
        id: f.id,
        term: f.term,
        definition: f.definition,
        category: f.category,
        difficulty: f.difficulty,
        known: f.known,
      })),
      slideshow: slideshow
        ? {
            id: slideshow.id,
            title: slideshow.title,
            subtitle: slideshow.subtitle,
            slides: slideshow.slides,
          }
        : null,
    });
  } catch (err) {
    console.error('[notebook-pdf/data]', err);
    return Response.json({ error: 'Failed to load notebook data' }, { status: 500 });
  }
}