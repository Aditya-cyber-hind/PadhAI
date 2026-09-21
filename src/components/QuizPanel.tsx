'use client';

import { useEffect, useState } from 'react';
import { downloadBlob, safeFilename } from '@/lib/export/download';
import { quizToMarkdown } from '@/lib/export/markdown';
import { quizToPdf } from '@/lib/export/pdf';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizMeta {
  id: string;
  notebook_id: string;
  user_id: string;
  title: string;
  difficulty: string;
  question_count: number;
  created_at: string;
}

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
}

type View = 'list' | 'setup' | 'taking';
type CountOption = 'less' | 'standard' | 'more' | 'alot';
type DifficultyOption = 'easy' | 'standard' | 'hard' | 'expert';

const COUNT_TO_NUMBER: Record<CountOption, number> = {
  less: 3,
  standard: 5,
  more: 8,
  alot: 12,
};

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function QuizPanel({ sources, notebookId, hasSources }: Props) {
  const [view, setView] = useState<View>('list');
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeQuizTitle, setActiveQuizTitle] = useState('PadhAI Quiz');

  // Taking state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  // Setup state
  const [count, setCount] = useState<CountOption>('standard');
  const [difficulty, setDifficulty] = useState<DifficultyOption>('standard');

  // Load quiz list on mount + when notebook changes
  useEffect(() => {
    if (!notebookId) return;
    let cancelled = false;
    setLoadingList(true);
    (async () => {
      try {
        const res = await fetch(`/api/quiz?notebookId=${notebookId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.quizzes)) setQuizzes(data.quizzes);
      } catch (err) {
        console.error('[quiz] list load failed:', err);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notebookId]);

  const refreshList = async () => {
    try {
      const res = await fetch(`/api/quiz?notebookId=${notebookId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.quizzes)) setQuizzes(data.quizzes);
    } catch (err) {
      console.error('[quiz] list refresh failed:', err);
    }
  };

  const openQuiz = async (quizId: string, title: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quiz/${quizId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load quiz');
      setQuestions(data.quiz.questions);
      setActiveQuizTitle(data.quiz.title);
      setCurrentIndex(0);
      setSelected(null);
      setAnswers([]);
      setComplete(false);
      setView('taking');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!hasSources) {
      setError('Please upload a PDF or paste some text first.');
      return;
    }

    setLoading(true);
    setError('');
    setComplete(false);

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources,
          notebookId,
          numQuestions: COUNT_TO_NUMBER[count],
          difficulty,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate quiz');

      setQuestions(data.quiz.questions);
      setActiveQuizTitle(data.quiz.title);
      setCurrentIndex(0);
      setSelected(null);
      setAnswers([]);
      setView('taking');
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quiz failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteQuizById = async (quizId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this quiz?')) return;
    try {
      const res = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE' });
      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      }
    } catch (err) {
      console.error('[quiz] delete failed:', err);
    }
  };

  const deleteAllQuizzes = async () => {
    if (!confirm('Delete ALL quizzes for this notebook? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/quiz?notebookId=${notebookId}`, { method: 'DELETE' });
      if (res.ok) setQuizzes([]);
    } catch (err) {
      console.error('[quiz] delete all failed:', err);
    }
  };

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    setAnswers([...answers, index === questions[currentIndex].correctIndex]);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
    } else {
      setComplete(true);
    }
  };

  const handleExport = async (format: 'md' | 'pdf') => {
    if (questions.length === 0) return;
    const title = activeQuizTitle;
    const base = safeFilename(title);
    const meta = { title, generatedAt: new Date() };

    if (format === 'md') {
      const md = quizToMarkdown(questions, meta);
      downloadBlob(new Blob([md], { type: 'text/markdown' }), `${base}.md`);
      return;
    }

    const { extractMath, renderLatexToPng } = await import('@/lib/export/latex');
    const mathMap: Record<string, { dataUrl: string; width: number; height: number }> = {};
    let counter = 0;

    const buildField = (text: string) => {
      const { text: plain, segments } = extractMath(text);
      const placeholders: { key: string; latex: string; displayMode: boolean }[] = [];
      let out = plain;
      for (let i = 0; i < segments.length; i++) {
        const key = `MATH_${counter}`;
        out = out.replace(`{{MATH_${i}}}`, `{{${key}}}`);
        placeholders.push({
          key,
          latex: segments[i].latex,
          displayMode: segments[i].displayMode,
        });
        counter++;
      }
      return { text: out, placeholders };
    };

    const transformed = questions.map((q) => ({
      question: buildField(q.question),
      options: q.options.map(buildField),
      explanation: buildField(q.explanation),
      correctIndex: q.correctIndex,
    }));

    for (const q of transformed) {
      const fields = [q.question, ...q.options, q.explanation];
      for (const field of fields) {
        for (const p of field.placeholders) {
          if (mathMap[p.key]) continue;
          mathMap[p.key] = await renderLatexToPng(p.latex, p.displayMode);
        }
      }
    }

    const pdf = await quizToPdf(
      transformed.map((q) => ({
        question: q.question.text,
        options: q.options.map((o) => o.text),
        explanation: q.explanation.text,
        correctIndex: q.correctIndex,
      })),
      meta,
      mathMap
    );
    downloadBlob(pdf, `${base}.pdf`);
  };

  const score = answers.filter(Boolean).length;

  // ===== LIST VIEW =====
  if (view === 'list') {
    if (loadingList) {
      return (
        <div className="h-full overflow-y-auto">
          <div className="p-6 max-w-3xl mx-auto">
            <header className="mb-6">
              <h1 className="text-xl font-bold text-stone-900">📝 Quiz</h1>
              <p className="text-sm text-stone-500 animate-pulse">Loading quizzes...</p>
            </header>
          </div>
        </div>
      );
    }

    if (!hasSources && quizzes.length === 0) {
      return (
        <div className="h-full overflow-y-auto">
          <div className="p-6 max-w-3xl mx-auto">
            <header className="mb-6">
              <h1 className="text-xl font-bold text-stone-900">📝 Quiz</h1>
              <p className="text-sm text-stone-500">Test your knowledge from your sources</p>
            </header>
            <div className="bg-white p-12 rounded-lg border border-stone-200 text-center">
              <p className="text-5xl mb-4">📚</p>
              <h2 className="text-lg font-semibold text-stone-800 mb-2">No sources yet</h2>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                Upload a PDF or paste some text in the Sources panel. Then come back here to generate a quiz.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-stone-900">📝 Quiz</h1>
              <p className="text-sm text-stone-500">
                {quizzes.length === 0
                  ? 'Generate your first quiz from your sources'
                  : `${quizzes.length} saved quiz${quizzes.length === 1 ? '' : 'zes'}`}
              </p>
            </div>
            {quizzes.length > 0 && (
              <button
                onClick={deleteAllQuizzes}
                className="text-xs px-3 py-1.5 border border-stone-300 rounded hover:bg-stone-100 hover:border-red-300 hover:text-red-600"
              >
                Delete all
              </button>
            )}
          </header>

          <button
            onClick={() => {
              setView('setup');
              setError('');
            }}
            disabled={!hasSources}
            className="w-full mb-6 px-6 py-4 bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            + New Quiz
          </button>

          {quizzes.length > 0 && (
            <div className="space-y-3">
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  onClick={() => openQuiz(q.id, q.title)}
                  className="group bg-white rounded-xl border border-stone-200 p-5 cursor-pointer hover:border-stone-400 hover:shadow-md transition relative"
                >
                  <h3 className="font-semibold text-stone-900 pr-10 truncate">
                    {q.title}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {q.question_count} question{q.question_count === 1 ? '' : 's'}
                    {' · '}
                    <span className="capitalize">{q.difficulty}</span>
                    {' · '}
                    {formatRelativeDate(q.created_at)}
                  </p>
                  <button
                    onClick={(e) => deleteQuizById(q.id, e)}
                    className="absolute top-4 right-4 p-1.5 text-stone-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                    title="Delete quiz"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {quizzes.length === 0 && hasSources && (
            <div className="bg-white p-8 rounded-lg border border-stone-200 text-center">
              <p className="text-4xl mb-3">✨</p>
              <p className="text-sm text-stone-500">
                No quizzes yet. Click "New Quiz" to generate one from your sources.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== SETUP VIEW =====
  if (view === 'setup') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <button
            onClick={() => {
              setView('list');
              setError('');
            }}
            className="text-xs text-stone-500 hover:text-stone-800 mb-4"
          >
            ← Back to quizzes
          </button>

          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">New Quiz</h1>
            <p className="text-sm text-stone-500">
              Questions will be saved automatically so you can retake them anytime.
            </p>
          </header>

          <div className="bg-white p-6 rounded-lg border border-stone-200">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  Number of questions
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(e.target.value as CountOption)}
                  className="w-full p-3 border border-stone-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="less">Less (3)</option>
                  <option value="standard">Standard (5)</option>
                  <option value="more">More (8)</option>
                  <option value="alot">A lot (12)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyOption)}
                  className="w-full p-3 border border-stone-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="easy">Easy</option>
                  <option value="standard">Standard</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={generateQuiz}
                disabled={loading}
                className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-40"
              >
                {loading ? 'Generating...' : 'Generate Quiz'}
              </button>
              {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== TAKING VIEW — loading =====
  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">📝 Quiz</h1>
            <p className="text-sm text-stone-500 animate-pulse">Loading...</p>
          </header>
        </div>
      </div>
    );
  }

  // ===== TAKING VIEW — complete =====
  if (complete) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <button
            onClick={() => {
              setView('list');
              setComplete(false);
            }}
            className="text-xs text-stone-500 hover:text-stone-800 mb-4"
          >
            ← Back to quizzes
          </button>

          <div className="bg-white p-6 rounded-lg border border-stone-200">
            <h2 className="text-2xl font-bold mb-4">
              You scored {score}/{questions.length}
            </h2>
            <div className="space-y-4 mb-6">
              {questions.map((q, i) => (
                <div key={i} className="text-sm border-b border-stone-100 pb-3">
                  <p className="font-medium mb-1">Q{i + 1}: {q.question}</p>
                  <p className={answers[i] ? 'text-green-700' : 'text-red-600'}>
                    {answers[i] ? '✓ Correct' : '✗ Wrong'} — {q.options[q.correctIndex]}
                  </p>
                  <p className="text-stone-600 italic mt-1">{q.explanation}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setSelected(null);
                  setAnswers([]);
                  setComplete(false);
                }}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-700"
              >
                Try Again
              </button>
              <button
                onClick={() => handleExport('md')}
                className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-100"
              >
                ↓ Markdown
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-100"
              >
                ↓ PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== TAKING VIEW — active question =====
  const q = questions[currentIndex];
  if (!q) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <p className="text-sm text-stone-500">No questions in this quiz.</p>
          <button
            onClick={() => setView('list')}
            className="mt-4 text-xs text-stone-500 hover:text-stone-800"
          >
            ← Back to quizzes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-3xl mx-auto">
        <button
          onClick={() => {
            setView('list');
            setComplete(false);
          }}
          className="text-xs text-stone-500 hover:text-stone-800 mb-4"
        >
          ← Back to quizzes
        </button>

        <div className="mb-4 flex justify-between items-center text-sm text-stone-500">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <div className="flex items-center gap-2">
            <span>Score: {score}</span>
            <button
              onClick={() => handleExport('md')}
              className="text-xs px-2.5 py-1.5 border border-stone-300 rounded hover:bg-stone-100"
            >
              ↓ MD
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="text-xs px-2.5 py-1.5 border border-stone-300 rounded hover:bg-stone-100"
            >
              ↓ PDF
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-stone-200">
          <h2 className="text-lg font-semibold mb-4">{q.question}</h2>

          <div className="space-y-2">
            {q.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={selected !== null}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selected === i
                    ? i === q.correctIndex
                      ? 'bg-green-50 border-green-500'
                      : 'bg-red-50 border-red-500'
                    : selected !== null && i === q.correctIndex
                    ? 'bg-green-50 border-green-500'
                    : 'bg-white border-stone-200 hover:border-stone-400'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {selected !== null && (
            <div className="mt-4">
              <p className="text-sm text-stone-600 italic mb-4">{q.explanation}</p>
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-700"
              >
                {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}