import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function hasSeenOnboarding(userId: string): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT has_seen_welcome
      FROM user_onboarding
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    if (rows.length === 0) return false;
    return Boolean((rows[0] as any).has_seen_welcome);
  } catch (err) {
    // Fail open: if the DB is having issues, don't block the user.
    console.error('[onboarding] hasSeen check failed:', err);
    return true;
  }
}

export async function markOnboardingSeen(userId: string): Promise<void> {
  try {
    await sql`
      INSERT INTO user_onboarding (user_id, has_seen_welcome, completed_at)
      VALUES (${userId}, TRUE, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        has_seen_welcome = TRUE,
        completed_at = COALESCE(user_onboarding.completed_at, NOW()),
        updated_at = NOW()
    `;
  } catch (err) {
    console.error('[onboarding] mark seen failed:', err);
  }
}