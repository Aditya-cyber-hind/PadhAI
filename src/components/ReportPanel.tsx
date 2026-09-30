'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import ConfirmModal from './ConfirmModal';
import EmptyState from './EmptyState';
import PanelSkeleton from './PanelSkeleton';

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
      <PanelSkeleton
        variant="card"
        rows={3}
        status="Analyzing sources and structuring report..."
      />
    );
  }

  if (!initialLoadDone) {
    return <PanelSkeleton variant="card" rows={2} status="Loading your report..." />;
  }

  if (!markdown) {
    if (!hasSources) {
      return (
        <EmptyState
          emoji="📄"
          title="Turn sources into a report"
          description="Get a structured write-up with executive summary, sections, key takeaways, and references — all grounded in your sources."
          hint="Add a source first — then come back to generate your report."
        />
      );
    }
    return (
      <EmptyState
        emoji="📄"
        title="No report yet"
        description="Generate a comprehensive report from your sources — structured, cited, and ready to share."
        actionLabel="Generate Report"
        onAction={generateReport}
        footer={error ? <p className="text-red-600 text-sm">{error}</p> : undefined}
      />
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
                className="text-xs sm:text-sm px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 transition disabled:opacity-40"
              >
                Regenerate
              </button>
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs sm:text-sm px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 hover:border-red-300 hover:text-red-600 transition"
              >
                🗑️ Clear
              </button>
            </div>
          </header>

          <div className="bg-white p-6 sm:p-8 rounded-xl border border-stone-200 prose prose-stone max-w-none">
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