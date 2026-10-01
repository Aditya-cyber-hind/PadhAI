'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';
import EmptyState from './EmptyState';
import PanelSkeleton from './PanelSkeleton';
import BrainMapNodePanel, { NODE_COLORS, NODE_TYPE_LABEL } from './BrainMapNodePanel';
import { brainMapToMarkdown, exportGraphAsPng } from '@/lib/export/brainmap';
import { downloadBlob, safeFilename } from '@/lib/export/download';
import type { BrainMapNode, BrainMapEdge } from '@/lib/brainmaps/db';
import { useWorkspaceActions } from './WorkspaceActionsContext';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

interface Props {
  sources: string;
  notebookId: string;
  hasSources: boolean;
}

const ALL_TYPES: Array<BrainMapNode['type']> = [
  'concept',
  'formula',
  'process',
  'term',
  'person',
  'event',
];

export default function BrainMapPanel({ sources, notebookId, hasSources }: Props) {
  const { askAbout, addFlashcard } = useWorkspaceActions();

  const [data, setData] = useState<{ nodes: BrainMapNode[]; edges: BrainMapEdge[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [error, setError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(
    new Set(ALL_TYPES as string[])
  );
  const [focusMode, setFocusMode] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const graphRef = useRef<any>(null);

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
      setSelectedNodeId(null);
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
      setSelectedNodeId(null);
    } catch (err) {
      console.error('[brainmap] clear failed:', err);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedNodeId) setSelectedNodeId(null);
        if (exportOpen) setExportOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNodeId, exportOpen]);

  useEffect(() => {
    if (!exportOpen) return;
    const onClick = () => setExportOpen(false);
    setTimeout(() => window.addEventListener('click', onClick), 0);
    return () => window.removeEventListener('click', onClick);
  }, [exportOpen]);

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim() || !data) return new Set<string>();
    const q = searchQuery.trim().toLowerCase();
    return new Set(
      data.nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id)
    );
  }, [searchQuery, data]);

  const graphData = useMemo(() => {
    if (!data) return null;

    let nodeIds: Set<string>;
    if (searchMatches.size > 0) {
      const matches = data.nodes.filter(
        (n) => enabledTypes.has(n.type) && searchMatches.has(n.id)
      );
      const matchIds = new Set(matches.map((m) => m.id));
      for (const e of data.edges) {
        if (matchIds.has(e.source)) matchIds.add(e.target);
        if (matchIds.has(e.target)) matchIds.add(e.source);
      }
      nodeIds = matchIds;
    } else {
      nodeIds = new Set(
        data.nodes.filter((n) => enabledTypes.has(n.type)).map((n) => n.id)
      );
    }

    if (focusMode && selectedNodeId) {
      const focusIds = new Set<string>([selectedNodeId]);
      for (const e of data.edges) {
        if (e.source === selectedNodeId) focusIds.add(e.target);
        if (e.target === selectedNodeId) focusIds.add(e.source);
      }
      nodeIds = new Set([...nodeIds].filter((id) => focusIds.has(id)));
    }

    return {
      nodes: data.nodes
        .filter((n) => nodeIds.has(n.id))
        .map((n) => ({
          id: n.id,
          label: n.label,
          type: n.type || 'concept',
          importance: n.importance ?? 3,
          summary: n.summary || '',
          sourceRefs: n.sourceRefs,
          val: 4 + (n.importance ?? 3) * 1.2,
          _highlight: searchMatches.has(n.id),
        })),
      links: data.edges
        .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e) => ({
          source: e.source,
          target: e.target,
          label: e.label,
          strength: e.strength ?? 0.5,
        })),
    };
  }, [data, enabledTypes, searchMatches, focusMode, selectedNodeId]);

  const stats = useMemo(() => {
    if (!data) return null;
    const types = new Map<string, number>();
    for (const n of data.nodes) {
      const t = n.type || 'concept';
      types.set(t, (types.get(t) || 0) + 1);
    }
    return {
      nodes: data.nodes.length,
      edges: data.edges.length,
      sources: new Set(data.nodes.flatMap((n) => n.sourceRefs || [])).size,
      types: Array.from(types.entries()),
    };
  }, [data]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !data) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, data]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleJumpTo = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      if (graphRef.current && graphData) {
        const node = graphData.nodes.find((n) => n.id === nodeId);
        if (node && (node as any).x !== undefined) {
          graphRef.current.centerAt((node as any).x, (node as any).y, 400);
          graphRef.current.zoom(2.2, 400);
        }
      }
    },
    [graphData]
  );

  const handleExplain = useCallback(
    (node: BrainMapNode) => {
      askAbout(
        `Explain "${node.label}" in detail. What is it, why does it matter, and how does it relate to the rest of the material?`
      );
    },
    [askAbout]
  );

  const handleAddFlashcard = useCallback(
    async (node: BrainMapNode) => {
      const category: string =
        node.type === 'formula'
          ? 'formula'
          : node.type === 'person'
          ? 'person'
          : node.type === 'event'
          ? 'event'
          : node.type === 'term'
          ? 'term'
          : 'concept';

      await addFlashcard({
        term: node.label,
        definition: node.summary || '',
        category,
        difficulty: Math.max(1, Math.min(5, 6 - (node.importance ?? 3))),
      });
    },
    [addFlashcard]
  );

  const handleExportMarkdown = () => {
    if (!data) return;
    const md = brainMapToMarkdown(data.nodes, data.edges, {
      title: 'PadhAI Brain Map',
      generatedAt: new Date(),
    });
    downloadBlob(
      new Blob([md], { type: 'text/markdown' }),
      `${safeFilename('PadhAI Brain Map')}.md`
    );
    setExportOpen(false);
  };

  const handleExportPng = async () => {
    const container = document.querySelector('.force-graph-container');
    const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      console.error('[brainmap] canvas not found');
      setExportOpen(false);
      return;
    }
    await exportGraphAsPng(canvas, `${safeFilename('PadhAI Brain Map')}.png`);
    setExportOpen(false);
  };

  const toggleType = (type: string) => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  if (loading) {
    return (
      <PanelSkeleton
        variant="card"
        rows={3}
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
          description="Build a visual map of the key ideas in your sources — and how they relate."
          hint="Add a source first — then come back to build your map."
        />
      );
    }
    return (
      <EmptyState
        emoji="🧠"
        title="Nothing to map yet"
        description="Generate a concept graph from your sources. Click any node to see what it is and where it comes from."
        actionLabel="Generate Brain Map"
        onAction={generateMap}
        footer={error ? <p className="text-red-600 text-sm">{error}</p> : undefined}
      />
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-white relative">
        <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white flex-shrink-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-accent-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="5" cy="6" r="2" />
                  <circle cx="19" cy="6" r="2" />
                  <circle cx="5" cy="18" r="2" />
                  <circle cx="19" cy="18" r="2" />
                  <line x1="10" y1="10" x2="6.5" y2="7" />
                  <line x1="14" y1="10" x2="17.5" y2="7" />
                  <line x1="10" y1="14" x2="6.5" y2="17" />
                  <line x1="14" y1="14" x2="17.5" y2="17" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-base sm:text-lg font-bold text-stone-900 leading-tight">
                  Brain Map
                </h1>
                {stats && (
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {stats.nodes} concepts · {stats.edges} connections
                    {stats.sources > 0 &&
                      ` · from ${stats.sources} source${stats.sources === 1 ? '' : 's'}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExportOpen((v) => !v);
                  }}
                  className="text-xs sm:text-sm px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-100 transition flex items-center gap-1"
                >
                  ↓ Export
                </button>
                <AnimatePresence>
                  {exportOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-full mt-1 w-44 bg-white border border-stone-200 rounded-lg shadow-lg z-40 py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={handleExportPng}
                        className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-accent-50 hover:text-accent-700 transition"
                      >
                        📷 Graph as PNG
                      </button>
                      <button
                        onClick={handleExportMarkdown}
                        className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-accent-50 hover:text-accent-700 transition"
                      >
                        📝 Outline as Markdown
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={generateMap}
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
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search concepts..."
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  title="Clear search"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3 h-3"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {ALL_TYPES.map((type) => {
                const enabled = enabledTypes.has(type);
                const color = NODE_COLORS[type] || '#64748b';
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    title={`Toggle ${NODE_TYPE_LABEL[type]}`}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-all ${
                      enabled
                        ? 'border-stone-200 bg-white text-stone-700'
                        : 'border-transparent bg-stone-100 text-stone-400 opacity-60'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: enabled ? color : '#a8a29e',
                      }}
                    />
                    <span className="capitalize">{type}</span>
                  </button>
                );
              })}
            </div>

            {selectedNodeId && (
              <button
                onClick={() => setFocusMode((f) => !f)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                  focusMode
                    ? 'border-accent-400 bg-accent-50 text-accent-700 font-medium'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-accent-300'
                }`}
              >
                {focusMode ? '🎯 Focus: on' : '🎯 Focus'}
              </button>
            )}

            {searchQuery && searchMatches.size > 0 && (
              <span className="text-[10px] text-stone-500">
                {searchMatches.size} match{searchMatches.size === 1 ? '' : 'es'}
              </span>
            )}
            {searchQuery && searchMatches.size === 0 && (
              <span className="text-[10px] text-stone-400 italic">No matches</span>
            )}
          </div>
        </header>

        <div className="flex-1 min-h-0 relative bg-stone-50 force-graph-container">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData ?? { nodes: [], links: [] }}            
            nodeLabel={(n: any) => `${n.label}`}
            nodeVal={(n: any) => n.val}
            nodeColor={(n: any) => NODE_COLORS[n.type] || '#64748b'}
            linkWidth={(l: any) => 1 + (l.strength ?? 0.5) * 2}
            linkColor={(l: any) =>
              (l.strength ?? 0.5) >= 0.7 ? '#a8a29e' : '#e7e5e4'
            }
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkLabel={(l: any) => l.label}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(link: any, ctx: any, globalScale: any) => {
              const strength = link.strength ?? 0.5;
              if (strength < 0.7) return;

              // Only draw edge labels when zoomed in enough to have room.
              // Below this zoom threshold, the graph is too dense and labels
              // collide with node labels.
              if (globalScale < 2.0) return;

              const start = link.source;
              const end = link.target;
              if (!start || !end) return;

              // Guard against uninitialized node positions
              if (
                typeof start.x !== 'number' ||
                typeof start.y !== 'number' ||
                typeof end.x !== 'number' ||
                typeof end.y !== 'number'
              ) {
                return;
              }

              // Skip very short edges — no room for text between nodes
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const edgeLength = Math.sqrt(dx * dx + dy * dy);
              if (edgeLength < 30) return;

              const x = start.x + dx * 0.5;
              const y = start.y + dy * 0.5;

              // Fade in as we zoom from 1.4 to 2.0
              const opacity = Math.min(1, (globalScale - 1.4) / 0.6);

              const label = link.label;
              const fontSize = Math.max(9 / globalScale, 2.5);

              ctx.save();
              ctx.globalAlpha = opacity;

              ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              // Small halo behind the text so it reads clearly over the line
              const textWidth = ctx.measureText(label).width;
              const padding = 2 / globalScale;
              ctx.fillStyle = 'rgba(245, 245, 244, 0.9)';
              ctx.fillRect(
                x - textWidth / 2 - padding,
                y - fontSize / 2 - padding,
                textWidth + padding * 2,
                fontSize + padding * 2
              );

              // The label itself
              ctx.fillStyle = '#78716c';
              ctx.fillText(label, x, y);

              ctx.restore();
            }}
            onNodeClick={handleNodeClick}
            nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
              const label = node.label;
              const isSelected = node.id === selectedNodeId;
              const isHighlighted = node._highlight;
              const radius = 3.5 + (node.importance ?? 3) * 0.9;
              const color = NODE_COLORS[node.type] || '#64748b';

              if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius + 2.5, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
                ctx.fill();
              }
              if (isHighlighted && !isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
                ctx.fill();
              }

              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
              if (isSelected) {
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.5 / globalScale;
                ctx.stroke();
              }

              const fontSize = Math.max(11 / globalScale, 3);
              ctx.font = `${isSelected || isHighlighted ? '600' : '500'} ${fontSize}px Inter, system-ui, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = isHighlighted ? '#b45309' : '#1c1917';
              ctx.fillText(label, node.x, node.y + radius + 2);
            }}
            d3AlphaDecay={0.0228}
            d3VelocityDecay={0.4}
            cooldownTicks={120}
          />

          <BrainMapNodePanel
            node={selectedNode}
            allNodes={data.nodes}
            allEdges={data.edges}
            onClose={() => {
              setSelectedNodeId(null);
              setFocusMode(false);
            }}
            onJumpTo={handleJumpTo}
            onExplain={handleExplain}
            onAddFlashcard={handleAddFlashcard}
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