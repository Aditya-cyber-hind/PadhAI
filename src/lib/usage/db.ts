import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const DAILY_TOKEN_LIMIT = 100_000;
export const ORG_DAILY_LIMIT = 550_000;

export async function getTodayUsage(userId: string): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(tokens_used), 0)::int AS total
    FROM usage_logs
    WHERE user_id = ${userId}
      AND created_at >= NOW() - INTERVAL '24 hours'
  `;
  return (rows[0] as { total: number }).total;
}

export async function getOrgUsage(): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(tokens_used), 0)::int AS total
    FROM usage_logs
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  `;
  return (rows[0] as { total: number }).total;
}

export async function logUsage(
  userId: string,
  model: string,
  tokens: number,
  endpoint: string
): Promise<void> {
  await sql`
    INSERT INTO usage_logs (user_id, model, tokens_used, endpoint)
    VALUES (${userId}, ${model}, ${tokens}, ${endpoint})
  `;
}

export interface UsageStatus {
  used: number;
  limit: number;
  remaining: number;
  ok: boolean;
}

export async function checkAndGetUsage(userId: string): Promise<UsageStatus> {
  const used = await getTodayUsage(userId);
  return {
    used,
    limit: DAILY_TOKEN_LIMIT,
    remaining: Math.max(0, DAILY_TOKEN_LIMIT - used),
    ok: used < DAILY_TOKEN_LIMIT,
  };
}