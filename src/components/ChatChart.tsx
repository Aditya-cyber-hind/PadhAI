'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartPayloadType } from '@/lib/chat/chart-schema';

const COLORS = [
  '#f59e0b',
  '#3b82f6',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

interface Props {
  payload: ChartPayloadType;
}

export default function ChatChart({ payload }: Props) {
  const [expanded, setExpanded] = useState(false);

  const chartHeight = expanded ? 420 : 260;

  return (
    <div className="my-3 rounded-xl border border-stone-200 bg-white p-3 sm:p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          {payload.title && (
            <h4 className="font-display text-sm sm:text-base font-semibold text-stone-900 truncate">
              {payload.title}
            </h4>
          )}
          {(payload.xLabel || payload.yLabel) && (
            <p className="text-[11px] text-stone-500 mt-0.5">
              {payload.yLabel || 'Value'}
              {payload.xLabel ? ` by ${payload.xLabel}` : ''}
              {payload.unit ? ` (${payload.unit})` : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          )}
        </button>
      </div>

      <div style={{ width: '100%', height: chartHeight }}>
        <ResponsiveContainer>
          {renderChart(payload)}
        </ResponsiveContainer>
      </div>

      {payload.data.length <= 12 && (
        <div className="mt-2 text-[10px] text-stone-400 text-center">
          {payload.data.length} data points
          {payload.unit ? ` · measured in ${payload.unit}` : ''}
        </div>
      )}
    </div>
  );
}

function renderChart(payload: ChartPayloadType) {
  const commonAxis = {
    tick: { fontSize: 11, fill: '#78716c' },
    stroke: '#d6d3d1',
  };

  const commonTooltip = {
    contentStyle: {
      borderRadius: 8,
      border: '1px solid #e7e5e4',
      fontSize: 12,
      padding: '6px 10px',
    },
    labelStyle: { fontWeight: 600, color: '#1c1917' },
  };

  if (payload.type === 'bar') {
    return (
      <BarChart data={payload.data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
        <XAxis dataKey="label" {...commonAxis} />
        <YAxis {...commonAxis} />
        <Tooltip {...commonTooltip} />
        <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
      </BarChart>
    );
  }

  if (payload.type === 'line') {
    return (
      <LineChart data={payload.data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
        <XAxis dataKey="label" {...commonAxis} />
        <YAxis {...commonAxis} />
        <Tooltip {...commonTooltip} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#f59e0b' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    );
  }

  if (payload.type === 'area') {
    return (
      <AreaChart data={payload.data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
        <XAxis dataKey="label" {...commonAxis} />
        <YAxis {...commonAxis} />
        <Tooltip {...commonTooltip} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#f59e0b"
          strokeWidth={2.5}
          fill="url(#areaFill)"
        />
      </AreaChart>
    );
  }

  if (payload.type === 'pie' || payload.type === 'donut') {
    const innerRadius = payload.type === 'donut' ? '55%' : 0;
    return (
      <PieChart margin={{ top: 8, right: 12, left: 12, bottom: 4 }}>
        <Tooltip {...commonTooltip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Pie
          data={payload.data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius="80%"
          innerRadius={innerRadius}
          paddingAngle={2}
        >
          {payload.data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    );
  }

  if (payload.type === 'scatter') {
    return (
      <ScatterChart margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
        <XAxis type="category" dataKey="label" {...commonAxis} />
        <YAxis type="number" dataKey="value" {...commonAxis} />
        <Tooltip {...commonTooltip} />
        <Scatter data={payload.data} fill="#f59e0b" />
      </ScatterChart>
    );
  }

  return null;
}