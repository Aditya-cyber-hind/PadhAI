'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

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
  userId: string;
  hasSources: boolean;
}

export default function BrainMapPanel({ sources, userId, hasSources }: Props) {
  const [data, setData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        body: JSON.stringify({ sources, userId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed');

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">🧠 Brain Map</h1>
            <p className="text-sm text-stone-500">Visualize concepts and relationships</p>
          </header>

          <div className="bg-white p-6 rounded-lg border border-stone-200 text-center">
            <p className="text-stone-600 mb-4">
              Generate a concept map from your sources.
            </p>
            <button
              onClick={generateMap}
              disabled={loading}
              className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Brain Map'}
            </button>
            {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  const graphData = {
    nodes: data.nodes.map((n) => ({ id: n.id, name: n.label, val: n.importance })),
    links: data.edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
  };

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-stone-200 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-stone-900">🧠 Brain Map</h1>
          <p className="text-sm text-stone-500">{data.nodes.length} concepts</p>
        </div>
        <button
          onClick={generateMap}
          className="text-sm px-3 py-1 border border-stone-300 rounded hover:bg-stone-100"
        >
          Regenerate
        </button>
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
  );
}