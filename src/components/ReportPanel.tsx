'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  sources: string;
  userId: string;
  hasSources: boolean;
}

export default function ReportPanel({ sources, userId, hasSources }: Props) {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateReport = async () => {
    if (!hasSources) {
      setError('Please upload a PDF or paste some text first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      setMarkdown(data.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">📄 Report</h1>
            <p className="text-sm text-stone-500 animate-pulse">
              Analyzing sources and structuring report...
            </p>
          </header>

          <div className="bg-white p-8 rounded-lg border border-stone-200 space-y-6">
            {/* Title skeleton */}
            <div className="h-7 bg-stone-200 rounded w-2/3 animate-pulse" />

            {/* Summary skeleton */}
            <div className="space-y-2">
              <div className="h-4 bg-stone-100 rounded w-full animate-pulse" />
              <div className="h-4 bg-stone-100 rounded w-5/6 animate-pulse" />
            </div>

            {/* Section skeletons */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 pt-4 border-t border-stone-100">
                <div className="h-5 bg-stone-200 rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-stone-100 rounded w-full animate-pulse" />
                <div className="h-3 bg-stone-100 rounded w-11/12 animate-pulse" />
                <div className="h-3 bg-stone-100 rounded w-4/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!markdown) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">📄 Report</h1>
            <p className="text-sm text-stone-500">Generate a structured report</p>
          </header>

          <div className="bg-white p-6 rounded-lg border border-stone-200 text-center">
            <p className="text-stone-600 mb-4">
              Generate a comprehensive report from your sources.
            </p>
            <button
              onClick={generateReport}
              className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700"
            >
              Generate Report
            </button>
            {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white p-8 rounded-lg border border-stone-200 prose prose-stone max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>

        <button
          onClick={generateReport}
          className="mt-4 text-sm px-3 py-1 border border-stone-300 rounded hover:bg-stone-100"
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}