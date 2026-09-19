import { NextResponse } from 'next/server';

export const maxDuration = 10;

/**
 * Warm-up endpoint — called on page load to spin up the Node runtime
 * and open the Groq connection before the first real request.
 */
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
} 
