import { z } from 'zod';

export const ChartDataPoint = z.object({
  label: z.string(),
  value: z.number(),
});

export const ChartPayload = z.object({
  type: z.enum(['bar', 'line', 'area', 'pie', 'donut', 'scatter']),
  title: z.string().optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  unit: z.string().optional(),
  data: z.array(ChartDataPoint).min(2).max(30),
});

export type ChartPayloadType = z.infer<typeof ChartPayload>;

export function parseChartPayload(raw: string): ChartPayloadType | null {
  try {
    const trimmed = raw.trim();
    const parsed = JSON.parse(trimmed);
    const result = ChartPayload.safeParse(parsed);
    if (!result.success) {
      console.warn('[chart] schema validation failed:', result.error.issues);
      return null;
    }
    return result.data;
  } catch (err) {
    console.warn('[chart] JSON parse failed:', err);
    return null;
  }
}