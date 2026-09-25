import { neon } from '@neondatabase/serverless';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const sql = neon(process.env.DATABASE_URL!);

interface Slide {
  type: string;
  heading: string;
  bullets: string[];
  statement: string;
  sectionNumber: string;
  sectionLabel: string;
  takeaways: string[];
  notes: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

interface Flashcard {
  term: string;
  definition: string;
}

interface SourceMeta {
  source_name: string;
  source_type: string;
  char_count: number;
}

async function getSharedNotebook(token: string) {
  const notebookRows = await sql`
    SELECT id, name, emoji, created_at
    FROM notebooks
    WHERE share_token = ${token}
    LIMIT 1
  `;

  if (notebookRows.length === 0) return null;

  const notebook = notebookRows[0] as {
    id: string;
    name: string;
    emoji: string | null;
    created_at: string;
  };

  const [sources, quizRows, questionRows, flashcardRows, slideshowRows] =
    await Promise.all([
      sql`
        SELECT source_name, source_type, char_count
        FROM sources
        WHERE notebook_id = ${notebook.id}
        ORDER BY created_at ASC
      `,
      sql`
        SELECT id, title
        FROM quizzes
        WHERE notebook_id = ${notebook.id}
        ORDER BY created_at ASC
      `,
      sql`
        SELECT qq.quiz_id, qq.question, qq.options, qq.correct_index, qq.explanation, qq.position
        FROM quiz_questions qq
        JOIN quizzes q ON q.id = qq.quiz_id
        WHERE q.notebook_id = ${notebook.id}
        ORDER BY qq.quiz_id, qq.position ASC
      `,
      sql`
        SELECT term, definition
        FROM flashcards
        WHERE notebook_id = ${notebook.id}
        ORDER BY difficulty ASC, created_at ASC
      `,
      sql`
        SELECT title, subtitle, slides
        FROM slideshows
        WHERE notebook_id = ${notebook.id}
        ORDER BY created_at DESC
        LIMIT 1
      `,
    ]);

  // Group quiz questions
  const questionsByQuiz: Record<string, QuizQuestion[]> = {};
  for (const row of questionRows as any[]) {
    if (!questionsByQuiz[row.quiz_id]) questionsByQuiz[row.quiz_id] = [];
    questionsByQuiz[row.quiz_id].push({
      question: row.question,
      options: row.options,
      correctIndex: row.correct_index,
      explanation: row.explanation,
    });
  }

  const quizzes: Quiz[] = (quizRows as any[]).map((q) => ({
    id: q.id,
    title: q.title,
    questions: questionsByQuiz[q.id] || [],
  }));

  const slideshow = slideshowRows.length > 0
    ? (slideshowRows[0] as any)
    : null;

  return {
    notebook,
    sources: sources as SourceMeta[],
    quizzes,
    flashcards: flashcardRows as Flashcard[],
    slideshow,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSharedNotebook(token);

  if (!data) {
    return {
      title: 'Notebook not found',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${data.notebook.name} · PadhAI`,
    description: `A shared study notebook from PadhAI`,
    // Don't index shared notebooks — they're unlisted
    robots: { index: false, follow: false },
  };
}

export default async function SharedNotebookPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSharedNotebook(token);

  if (!data) notFound();

  const { notebook, sources, quizzes, flashcards, slideshow } = data;

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header banner */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/landing" className="text-sm font-semibold text-stone-900">
            🧠 PadhAI
          </Link>
          <Link
            href="/auth/sign-in"
            className="px-4 py-1.5 text-xs bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition"
          >
            Create your own
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Notebook title */}
        <section className="mb-10 text-center">
          {notebook.emoji && <div className="text-5xl mb-3">{notebook.emoji}</div>}
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
            {notebook.name}
          </h1>
          <p className="text-sm text-stone-500">
            Shared from PadhAI ·{' '}
            {new Date(notebook.created_at).toLocaleDateString(undefined, {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </section>

        {/* Sources */}
        {sources.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Based on {sources.length} source{sources.length === 1 ? '' : 's'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {sources.map((s, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs text-stone-700"
                >
                  {s.source_type === 'url' ? '🌐' : s.source_type === 'audio' ? '🎙️' : '📄'}{' '}
                  {s.source_name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Slideshow preview */}
        {slideshow && slideshow.slides && slideshow.slides.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Slideshow · {slideshow.slides.length} slides
            </h2>
            <div className="bg-stone-900 rounded-xl p-6 text-white">
              <h3 className="text-xl font-bold mb-2">{slideshow.title}</h3>
              {slideshow.subtitle && (
                <p className="text-sm text-stone-400 mb-4">{slideshow.subtitle}</p>
              )}
              <p className="text-xs text-stone-500">
                The full slideshow is available in the PadhAI app.
              </p>
            </div>
          </section>
        )}

        {/* Quizzes */}
        {quizzes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Quizzes · {quizzes.length}
            </h2>
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-xl border border-stone-200 p-5"
                >
                  <h3 className="font-semibold text-stone-900">{quiz.title}</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {quiz.questions.length} questions
                  </p>
                  <details className="mt-3">
                    <summary className="text-xs text-stone-600 cursor-pointer hover:text-stone-900">
                      Preview questions
                    </summary>
                    <ol className="mt-3 space-y-3 text-sm">
                      {quiz.questions.slice(0, 3).map((q, i) => (
                        <li key={i} className="text-stone-700">
                          <span className="font-medium">Q{i + 1}.</span> {q.question}
                        </li>
                      ))}
                      {quiz.questions.length > 3 && (
                        <li className="text-xs text-stone-400 italic">
                          + {quiz.questions.length - 3} more in the app
                        </li>
                      )}
                    </ol>
                  </details>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Flashcards */}
        {flashcards.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Flashcards · {flashcards.length}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {flashcards.slice(0, 6).map((c, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-stone-200 p-4"
                >
                  <p className="text-sm font-semibold text-stone-900 mb-1">
                    {c.term}
                  </p>
                  <p className="text-xs text-stone-600 line-clamp-3">
                    {c.definition}
                  </p>
                </div>
              ))}
            </div>
            {flashcards.length > 6 && (
              <p className="text-xs text-stone-400 mt-3 text-center">
                + {flashcards.length - 6} more in the app
              </p>
            )}
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-10 border-t border-stone-200">
          <h2 className="text-xl font-bold text-stone-900 mb-2">
            Want your own study workspace?
          </h2>
          <p className="text-sm text-stone-600 mb-5">
            Upload your notes, generate quizzes, and study smarter with PadhAI.
          </p>
          <Link
            href="/auth/sign-in"
            className="inline-block px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition font-medium"
          >
            Get started — it's free
          </Link>
        </section>
      </div>
    </main>
  );
}