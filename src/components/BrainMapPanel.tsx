'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ConfirmModal from './ConfirmModal';
import EmptyState from './EmptyState';
import PanelSkeleton from './PanelSkeleton';

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
      <PanelSkeleton
        variant="card"
        rows={2}
        status="Extracting concepts and relationships..."
      />
    );
  }

  if (!initialLoadDone) {
    return <PanelSkeleton variant="card" rows={2} status="Loading your brain map..." />;
  }

  if (!data) {
    if (!hasSources) {
      return (
        <EmptyState
          emoji="🧠"
          title="See how concepts connect"
          description="Build a force-directed graph of the key ideas in your sources — and how they relate."
          hint="Add a source first — then come back to build your map."
        />
      );
    }
    return (
      <EmptyState
        emoji="🧠"
        title="Nothing to map yet"
        description="Generate a concept graph from your sources to visualize how ideas connect."
        actionLabel="Generate Brain Map"
        onAction={generateMap}
        footer={error ? <p className="text-red-600 text-sm">{error}</p> : undefined}
      />
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
              className="text-xs sm:text-sm px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
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