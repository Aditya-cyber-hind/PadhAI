import type { QuizQuestion, Flashcard } from './types';

export function quizToMarkdown(
  questions: QuizQuestion[],
  meta: { title: string; generatedAt: Date }
): string {
  const lines: string[] = [];
  lines.push(`# ${meta.title} — Quiz`);
  lines.push('');
  lines.push(`_Generated ${meta.generatedAt.toLocaleString()}_`);
  lines.push('');
  lines.push(`**Questions:** ${questions.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  questions.forEach((q, i) => {
    lines.push(`## Q${i + 1}. ${q.question}`);
    lines.push('');
    q.options.forEach((opt, j) => {
      const letter = String.fromCharCode(65 + j);
      lines.push(`- **${letter}.** ${opt}`);
    });
    lines.push('');
    lines.push(
      `**Answer:** ${String.fromCharCode(65 + q.correctIndex)} — ${q.options[q.correctIndex]}`
    );
    lines.push('');
    lines.push(`> ${q.explanation}`);
    lines.push('');
  });

  return lines.join('\n');
}

export function flashcardsToMarkdown(
  cards: Flashcard[],
  meta: { title: string; generatedAt: Date }
): string {
  const lines: string[] = [];
  lines.push(`# ${meta.title} — Flashcards`);
  lines.push('');
  lines.push(`_Generated ${meta.generatedAt.toLocaleString()}_`);
  lines.push('');
  lines.push(`**Cards:** ${cards.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  cards.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.term}`);
    lines.push('');
    lines.push(`**Category:** ${c.category} · **Difficulty:** ${c.difficulty}/5`);
    lines.push('');
    lines.push(c.definition);
    lines.push('');
  });

  return lines.join('\n');
}