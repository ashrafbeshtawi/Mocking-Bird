import { auth } from '@/lib/auth';

/**
 * Get the authenticated user ID from the session.
 * Use this in API routes instead of reading x-user-id header.
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
