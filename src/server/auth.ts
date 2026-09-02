import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { UserRow } from '@/db/schema';
import { assertSameOrigin, unauthorized } from './http';
import { readSessionCookie, refreshSessionIfStale, resolveSession } from './session';

/** Per-request memoised so a page and its children resolve the session once. */
export const getCurrentUser = cache(async (): Promise<UserRow | null> => {
  const session = await resolveSession(await readSessionCookie());
  return session?.user ?? null;
});

/** For server components behind the app shell. */
export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * The only way an API route should get a user. It also enforces the CSRF origin
 * check, so a route cannot accidentally accept a cross-site state change.
 */
export async function requireApiUser(request: Request): Promise<UserRow> {
  assertSameOrigin(request);
  const token = await readSessionCookie();
  const session = await resolveSession(token);
  if (!session || !token) throw unauthorized();
  await refreshSessionIfStale(session, token);
  return session.user;
}
