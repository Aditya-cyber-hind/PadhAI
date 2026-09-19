import { auth } from '@/lib/auth/server';
import { checkAndGetUsage } from '@/lib/usage/db';

export const maxDuration = 15;

export async function GET() {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await checkAndGetUsage(session.user.id);
    return Response.json(usage);
  } catch (error) {
    console.error('[usage GET]', error);
    return Response.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
} 
