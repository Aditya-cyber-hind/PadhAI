import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface QuizMeta {
  id: string;
  notebook_id: string;
  user_id: string;
  title: string;
  difficulty: string;
  question_count: number;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface FullQuiz extends QuizMeta {
  questions: QuizQuestion[];
}

export async function listQuizzes(
  notebookId: string,
  userId: string
): Promise<QuizMeta[]> {
  const rows = await sql`
    SELECT id, notebook_id, user_id, title, difficulty, question_count, created_at
    FROM quizzes
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows as QuizMeta[];
}

export async function getFullQuiz(
  quizId: string,
  userId: string
): Promise<FullQuiz | null> {
  const quizRows = await sql`
    SELECT id, notebook_id, user_id, title, difficulty, question_count, created_at
    FROM quizzes
    WHERE id = ${quizId} AND user_id = ${userId}
  `;
  if (quizRows.length === 0) return null;

  const questionRows = await sql`
    SELECT question, options, correct_index, explanation, position
    FROM quiz_questions
    WHERE quiz_id = ${quizId}
    ORDER BY position ASC
  `;

  const quiz = quizRows[0] as QuizMeta;
  const questions: QuizQuestion[] = questionRows.map((r: any) => ({
    question: r.question,
    options: r.options as string[],
    correctIndex: r.correct_index,
    explanation: r.explanation,
  }));

  return { ...quiz, questions };
}

export async function createQuiz(
  notebookId: string,
  userId: string,
  title: string,
  difficulty: string,
  questions: QuizQuestion[]
): Promise<QuizMeta> {
  const quizRows = await sql`
    INSERT INTO quizzes (notebook_id, user_id, title, difficulty, question_count)
    VALUES (${notebookId}, ${userId}, ${title}, ${difficulty}, ${questions.length})
    RETURNING id, notebook_id, user_id, title, difficulty, question_count, created_at
  `;
  const quiz = quizRows[0] as QuizMeta;

  // Insert questions one at a time (safe, small N)
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await sql`
      INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation, position)
      VALUES (${quiz.id}, ${q.question}, ${JSON.stringify(q.options)}::jsonb, ${q.correctIndex}, ${q.explanation}, ${i})
    `;
  }

  return quiz;
}

export async function deleteQuiz(
  quizId: string,
  userId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM quizzes
    WHERE id = ${quizId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function deleteAllQuizzes(
  notebookId: string,
  userId: string
): Promise<number> {
  const rows = await sql`
    DELETE FROM quizzes
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length;
}