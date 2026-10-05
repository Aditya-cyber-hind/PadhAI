import { auth } from '@/lib/auth/server';
import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/onboarding/db';

export const maxDuration = 10;

// GET — has the current user seen onboarding?
export async function GET() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const seen = await hasSeenOnboarding(userId);
    return Response.json({ seen });
  } catch (err) {
    console.error('[onboarding GET]', err);
    return Response.json({ error: 'Failed to check onboarding status' }, { status: 500 });
  }
}

// POST — mark onboarding as complete for the current user
export async function POST() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await markOnboardingSeen(userId);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[onboarding POST]', err);
    return Response.json({ error: 'Failed to mark onboarding seen' }, { status: 500 });
  }
}