'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import ConfirmModal from './ConfirmModal';

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
}

export default function ReportPanel({ sources, notebookId, hasSources }: Props) {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [error, setError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!notebookId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/report?notebookId=${notebookId}`);
        if (!res.ok) return;
        const result = await res.json();
        if (cancelled) return;
        if (result.report?.markdown) {
          setMarkdown(result.report.markdown);
        }
      } catch (err) {
        console.error('[report] load failed:', err);
      } finally {
        if (!cancelled) setInitialLoadDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notebookId]);

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
        body: JSON.stringify({ sources, notebookId }),
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

  const onConfirmClear = async () => {
    setConfirmClear(false);
    try {
      await fetch(`/api/report?notebookId=${notebookId}`, { method: 'DELETE' });
      setMarkdown('');
    } catch (err) {
      console.error('[report] clear failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <header className="mb-4 sm:mb-6">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">📄 Report</h1>
            <p className="text-sm text-stone-500 animate-pulse">
              Analyzing sources and structuring report...
            </p>
          </header>

          <div className="bg-white p-6 sm:p-8 rounded-lg border border-stone-200 space-y-6">
            <div className="h-7 bg-stone-200 rounded w-2/3 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-stone-100 rounded w-full animate-pulse" />
              <div className="h-4 bg-stone-100 rounded w-5/6 animate-pulse" />
            </div>
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

  if (!initialLoadDone) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <header className="mb-4 sm:mb-6">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">📄 Report</h1>
            <p className="text-sm text-stone-500 animate-pulse">Loading...</p>
          </header>
        </div>
      </div>
    );
  }

  if (!markdown) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <header className="mb-4 sm:mb-6">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">📄 Report</h1>
            <p className="text-sm text-stone-500">Generate a structured report</p>
          </header>

          {!hasSources ? (
            <div className="bg-white p-8 sm:p-12 rounded-lg border border-stone-200 text-center">
              <p className="text-5xl mb-4">📝</p>
              <h2 className="text-lg font-semibold text-stone-800 mb-2">
                No sources to report on
              </h2>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                Add a document first. PadhAI will then write a structured report based on it.
              </p>
            </div>
          ) : (
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-stone-200 text-center">
              <p className="text-stone-600 mb-4">
                Generate a comprehensive report from your sources.
              </p>
              <button
                onClick={generateReport}
                className="px-6 py-2.5 sm:py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 font-medium transition"
              >
                Generate Report
              </button>
              {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <header className="mb-4 sm:mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">📄 Report</h1>
              <p className="text-sm text-stone-500">Generated from your sources</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={generateReport}
                disabled={loading}
                className="text-xs sm:text-sm px-3 py-1.5 border border-stone-300 rounded hover:bg-stone-100 transition"
              >
                Regenerate
              </button>
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs sm:text-sm px-3 py-1.5 border border-stone-300 rounded hover:bg-stone-100 hover:border-red-300 hover:text-red-600 transition"
              >
                🗑️ Clear
              </button>
            </div>
          </header>

          <div className="bg-white p-6 sm:p-8 rounded-lg border border-stone-200 prose prose-stone max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmClear}
        title="Delete this report?"
        description="The generated report will be permanently deleted. You can regenerate it anytime from your sources."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={onConfirmClear}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}