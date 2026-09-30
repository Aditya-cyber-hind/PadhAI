'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ConfirmModal from './ConfirmModal';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface Node {
  id: string;
  label: string;
  importance: number;
}

interface Edge {
  source: string;
  target: string;
  label: string;
}

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
}

export default function BrainMapPanel({ sources, notebookId, hasSources }: Props) {
  const [data, setData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [error, setError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!notebookId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/brainmap?notebookId=${notebookId}`);
        if (!res.ok) return;
        const result = await res.json();
        if (cancelled) return;
        if (result.brainmap) {
          setData({
            nodes: result.brainmap.nodes,
            edges: result.brainmap.edges,
          });
        }
      } catch (err) {
        console.error('[brainmap] load failed:', err);
      } finally {
        if (!cancelled) setInitialLoadDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notebookId]);

  const generateMap = async () => {
    if (!hasSources) {
      setError('Please upload a PDF or paste some text first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/brainmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, notebookId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed');

      setData({ nodes: result.nodes, edges: result.edges });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const onConfirmClear = async () => {
    setConfirmClear(false);
    try {
      await fetch(`/api/brainmap?notebookId=${notebookId}`, { method: 'DELETE' });
      setData(null);
    } catch (err) {
      console.error('[brainmap] clear failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <header className="px-4 sm:px-6 py-4 bg-white border-b border-stone-200 flex-shrink-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">🧠 Brain Map</h1>
          <p className="text-sm text-stone-500 animate-pulse">
            Extracting concepts and relationships...
          </p>
        </header>

        <div className="flex-1 min-h-0 bg-white relative flex items-center justify-center">
          <div className="relative w-64 h-64">
            <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-stone-200 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            <div className="absolute top-4 left-4 w-12 h-12 bg-stone-100 rounded-full animate-pulse" />
            <div className="absolute top-4 right-4 w-12 h-12 bg-stone-100 rounded-full animate-pulse" />
            <div className="absolute bottom-4 left-8 w-12 h-12 bg-stone-100 rounded-full animate-pulse" />
            <div className="absolute bottom-4 right-8 w-12 h-12 bg-stone-100 rounded-full animate-pulse" />
            <div className="absolute top-1/2 left-1/2 w-40 h-px bg-stone-200 -translate-x-1/2 -translate-y-1/2 rotate-45" />
            <div className="absolute top-1/2 left-1/2 w-40 h-px bg-stone-200 -translate-x-1/2 -translate-y-1/2 -rotate-45" />
          </div>
          <p className="absolute bottom-8 text-stone-400 italic text-sm animate-pulse">
            Building concept graph...
          </p>
        </div>
      </div>
    );
  }

  if (!initialLoadDone) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <header className="mb-4 sm:mb-6">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">🧠 Brain Map</h1>
            <p className="text-sm text-stone-500 animate-pulse">Loading...</p>
          </header>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <header className="mb-4 sm:mb-6">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">🧠 Brain Map</h1>
            <p className="text-sm text-stone-500">Visualize concepts and relationships</p>
          </header>

          {!hasSources ? (
            <div className="bg-white p-8 sm:p-12 rounded-lg border border-stone-200 text-center">
              <p className="text-5xl mb-4">🕸️</p>
              <h2 className="text-lg font-semibold text-stone-800 mb-2">
                Nothing to map yet
              </h2>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                Upload a source to see the key concepts and how they connect.
              </p>
            </div>
          ) : (
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-stone-200 text-center">
              <p className="text-stone-600 mb-4">
                Generate a concept map from your sources.
              </p>
              <button
                onClick={generateMap}
                className="px-6 py-2.5 sm:py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 font-medium transition"
              >
                Generate Brain Map
              </button>
              {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  const graphData = {
    nodes: data.nodes.map((n) => ({ id: n.id, name: n.label, val: n.importance })),
    links: data.edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <header className="px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center bg-white border-b border-stone-200 flex-shrink-0">
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-stone-900">🧠 Brain Map</h1>
            <p className="text-xs sm:text-sm text-stone-500">{data.nodes.length} concepts</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateMap}
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

        <div className="flex-1 min-h-0 bg-white">
          <ForceGraph2D
            graphData={graphData}
            nodeLabel="name"
            nodeAutoColorBy="id"
            linkLabel="label"
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkWidth={2}
            d3AlphaDecay={0.0228}
            d3VelocityDecay={0.4}
          />
        </div>
      </div>

      <ConfirmModal
        open={confirmClear}
        title="Delete this brain map?"
        description="The concept graph for this notebook will be permanently deleted. You can regenerate it anytime from your sources."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={onConfirmClear}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}