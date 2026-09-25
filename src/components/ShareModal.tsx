'use client';

import { useEffect, useState } from 'react';

interface Props {
  notebookId: string;
  notebookName: string;
  onClose: () => void;
}

export default function ShareModal({ notebookId, notebookName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/notebooks/${notebookId}/share`, {
          method: 'POST',
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Failed to create link');
        setToken(data.token);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notebookId]);

  const shareUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${token}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      setError('Copy failed. Select the URL manually.');
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Revoke this share link? Anyone with the link will lose access.')) return;
    try {
      await fetch(`/api/notebooks/${notebookId}/share`, { method: 'DELETE' });
      onClose();
    } catch (err) {
      setError('Failed to revoke');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-stone-900 mb-1">
          Share "{notebookName}"
        </h2>
        <p className="text-sm text-stone-500 mb-5">
          Anyone with this link can view your sources, quizzes, flashcards, and
          slideshow. Your chat history stays private.
        </p>

        {loading && (
          <p className="text-sm text-stone-400 italic">Generating link...</p>
        )}

        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}

        {token && (
          <>
            <div className="flex gap-2 mb-4">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700 transition whitespace-nowrap"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-stone-200">
              <button
                onClick={handleRevoke}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Revoke link
              </button>
              <button
                onClick={onClose}
                className="text-xs text-stone-500 hover:text-stone-800"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}