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
              disabled={loading}
              className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Report'}
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