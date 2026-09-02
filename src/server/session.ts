import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { sessions, users } from '@/db/schema';
import type { UserRow } from '@/db/schema';
import { isProduction } from '@/lib/env';

export const SESSION_COOKIE = 'taskforge_session';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Sessions are extended once they are past halfway, so active users stay signed in. */
const REFRESH_AFTER_MS = SESSION_TTL_MS / 2;

/** The cookie holds an opaque random token; only its digest is stored. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type ActiveSession = { user: UserRow; sessionId: string; expiresAt: Date };

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function resolveSession(token: string | undefined): Promise<ActiveSession | null> {
  if (!token) return null;

  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return { user: row.user, sessionId: row.session.id, expiresAt: row.session.expiresAt };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** Used after a password reset: every other device is signed out. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

/** Only callable from route handlers and server actions. */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { ...cookieOptions(new Date(0)), maxAge: 0 });
}

export async function readSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

/** Slides the expiry forward for long-lived active sessions. */
export async function refreshSessionIfStale(session: ActiveSession, token: string): Promise<void> {
  if (session.expiresAt.getTime() - Date.now() > REFRESH_AFTER_MS) return;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, session.sessionId));
  await setSessionCookie(token, expiresAt);
}

/** Constant-time comparison helper for single-use tokens (password resets). */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export { hashToken };
