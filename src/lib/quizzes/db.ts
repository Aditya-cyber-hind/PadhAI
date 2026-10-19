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
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string | null;
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
    SELECT id, question, options, correct_index, explanation, position, topic
    FROM quiz_questions
    WHERE quiz_id = ${quizId}
    ORDER BY position ASC
  `;

  const quiz = quizRows[0] as QuizMeta;
  const questions: QuizQuestion[] = questionRows.map((r: any) => ({
    id: r.id,
    question: r.question,
    options: r.options as string[],
    correctIndex: r.correct_index,
    explanation: r.explanation,
    topic: r.topic ?? null,
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

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await sql`
      INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation, position, topic)
      VALUES (
        ${quiz.id},
        ${q.question},
        ${JSON.stringify(q.options)}::jsonb,
        ${q.correctIndex},
        ${q.explanation},
        ${i},
        ${q.topic ?? null}
      )
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

// ===== Quiz attempt persistence =====

export interface SubmitAnswer {
  question_id: string;
  selected_index: number;
}

export interface AttemptResult {
  attempt_id: string;
  score: number;
  total: number;
}

export async function submitAttempt(
  quizId: string,
  notebookId: string,
  userId: string,
  answers: SubmitAnswer[],
  durationSeconds?: number | null
): Promise<AttemptResult | null> {
  const rows = await sql`
    SELECT qq.id AS question_id, qq.correct_index
    FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.quiz_id = ${quizId}
      AND q.notebook_id = ${notebookId}
      AND q.user_id = ${userId}
  `;
  if (rows.length === 0) return null;

  const correctByQid = new Map<string, number>();
  for (const r of rows as { question_id: string; correct_index: number }[]) {
    correctByQid.set(r.question_id, r.correct_index);
  }

  let score = 0;
  const scored = answers.map((a) => {
    const correctIdx = correctByQid.get(a.question_id);
    const isCorrect = correctIdx !== undefined && a.selected_index === correctIdx;
    if (isCorrect) score++;
    return { ...a, is_correct: isCorrect };
  });

  const attemptRows = await sql`
    INSERT INTO quiz_attempts (quiz_id, notebook_id, user_id, score, total, duration_seconds)
    VALUES (${quizId}, ${notebookId}, ${userId}, ${score}, ${answers.length}, ${durationSeconds ?? null})
    RETURNING id
  `;
  const attemptId = (attemptRows[0] as { id: string }).id;

  for (const a of scored) {
    await sql`
      INSERT INTO quiz_answers (attempt_id, question_id, selected_index, is_correct)
      VALUES (${attemptId}, ${a.question_id}, ${a.selected_index}, ${a.is_correct})
    `;
  }

  return { attempt_id: attemptId, score, total: answers.length };
}

export interface AttemptSummary {
  id: string;
  score: number;
  total: number;
  duration_seconds: number | null;
  completed_at: string;
}

export async function listAttempts(
  quizId: string,
  userId: string
): Promise<AttemptSummary[]> {
  const rows = await sql`
    SELECT id, score, total, duration_seconds, completed_at
    FROM quiz_attempts
    WHERE quiz_id = ${quizId} AND user_id = ${userId}
    ORDER BY completed_at DESC
    LIMIT 20
  `;
  return rows as AttemptSummary[];
}