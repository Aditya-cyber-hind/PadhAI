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
}

export default function QuizPanel({ sources }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  const generateQuiz = async () => {
    if (!sources || sources.trim().length < 100) {
      setError('Please add more source material first (at least 100 characters).');
      return;
    }

    setLoading(true);
    setError('');
    setComplete(false);

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, numQuestions: 5 }),
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

  // ---- Initial state ----
  if (questions.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">📝 Quiz</h1>
            <p className="text-sm text-stone-500">Test your knowledge from your sources</p>
          </header>

          <div className="bg-white p-6 rounded-lg border border-stone-200 text-center">
            <p className="text-stone-600 mb-4">
              Generate a 5-question multiple-choice quiz from your sources.
            </p>
            <button
              onClick={generateQuiz}
              disabled={loading}
              className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Quiz'}
            </button>
            {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ---- Complete state ----
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
              onClick={generateQuiz}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Active question state ----
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