import type { BrainMapNode, BrainMapEdge } from '@/lib/brainmaps/db';

const NODE_TYPE_LABEL: Record<string, string> = {
  concept: 'Concept',
  formula: 'Formula',
  process: 'Process',
  term: 'Term',
  person: 'Person',
  event: 'Event',
};

export function brainMapToMarkdown(
  nodes: BrainMapNode[],
  edges: BrainMapEdge[],
  meta: { title: string; generatedAt: Date }
): string {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const lines: string[] = [];

  lines.push(`# ${meta.title} — Brain Map`);
  lines.push('');
  lines.push(`_Generated ${meta.generatedAt.toLocaleString()}_`);
  lines.push('');
  lines.push(`**${nodes.length} concepts · ${edges.length} connections**`);
  lines.push('');

  // Sort by importance desc, then label
  const sorted = [...nodes].sort((a, b) => {
    const impDiff = (b.importance ?? 0) - (a.importance ?? 0);
    if (impDiff !== 0) return impDiff;
    return a.label.localeCompare(b.label);
  });

  for (const node of sorted) {
    const typeLabel = NODE_TYPE_LABEL[node.type] || node.type || 'Concept';
    lines.push(`## ${node.label}`);
    lines.push(`> ${typeLabel} · Importance ${node.importance}/5`);
    lines.push('');
    if (node.summary) {
      lines.push(node.summary);
      lines.push('');
    }

    if (node.sourceRefs && node.sourceRefs.length > 0) {
      lines.push(`**Sources:** ${node.sourceRefs.join(', ')}`);
      lines.push('');
    }

    // Connections where this node is source or target
    const conns = edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .map((e) => {
        const otherId = e.source === node.id ? e.target : e.source;
        const other = nodeById.get(otherId);
        return { edge: e, other, dir: e.source === node.id ? '→' : '←' };
      })
      .filter((c) => c.other)
      .sort((a, b) => b.edge.strength - a.edge.strength);

    if (conns.length > 0) {
      lines.push('**Connections:**');
      lines.push('');
      for (const c of conns) {
        const pct = Math.round(c.edge.strength * 100);
        lines.push(`- ${c.dir} **${c.other!.label}** — _${c.edge.label}_ (${pct}%)`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Screenshot the canvas element of a force-graph and download as PNG.
 * `canvasEl` should be the <canvas> DOM node inside the graph container.
 */
export async function exportGraphAsPng(
  canvasEl: HTMLCanvasElement | null,
  filename: string
): Promise<boolean> {
  if (!canvasEl) return false;
  try {
    // ForceGraph2D renders to a single canvas — grab its data URL
    const dataUrl = canvasEl.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch (err) {
    console.error('[brainmap] PNG export failed:', err);
    return false;
  }
}