'use client';

import { useState } from 'react';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
}

type CountOption = 'less' | 'standard' | 'more' | 'alot';
type DifficultyOption = 'easy' | 'standard' | 'hard' | 'expert';

const COUNT_TO_NUMBER: Record<CountOption, number> = {
  less: 3,
  standard: 5,
  more: 8,
  alot: 12,
};

export default function QuizPanel({ sources, notebookId, hasSources }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  const [count, setCount] = useState<CountOption>('standard');
  const [difficulty, setDifficulty] = useState<DifficultyOption>('standard');

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

      setQuestions(data.questions);
      setCurrentIndex(0);
      setSelected(null);
      setAnswers([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quiz failed');
    } finally {
      setLoading(false);
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

  const score = answers.filter(Boolean).length;

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">📝 Quiz</h1>
            <p className="text-sm text-stone-500 animate-pulse">
              Generating {COUNT_TO_NUMBER[count]} questions...
            </p>
          </header>

          <div className="space-y-4">
            {Array.from({ length: Math.min(COUNT_TO_NUMBER[count], 5) }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-stone-200">
                <div className="h-4 bg-stone-200 rounded w-3/4 mb-4 animate-pulse" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-8 bg-stone-100 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">📝 Quiz</h1>
            <p className="text-sm text-stone-500">Test your knowledge from your sources</p>
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
                className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700"
              >
                Generate Quiz
              </button>
              {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">📝 Quiz</h1>
          </header>

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
            <button
              onClick={() => {
                setQuestions([]);
                setComplete(false);
              }}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-4 flex justify-between text-sm text-stone-500">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>Score: {score}</span>
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