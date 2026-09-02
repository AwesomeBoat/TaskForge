import { randomUUID } from 'node:crypto';
import type { UserRow } from '@/db/schema';
import { registerUser } from '@/server/account';
import { createSession, SESSION_COOKIE } from '@/server/session';
import { clearCookieJar, setCookie } from './cookies';

export const ORIGIN = 'http://localhost:3000';

type RequestInit = {
  method?: string;
  body?: unknown;
  /** Overridden to test the CSRF origin check. */
  origin?: string | null;
  ip?: string;
};

export function req(path: string, init: RequestInit = {}): Request {
  const method = init.method ?? 'GET';
  const headers = new Headers({ host: 'localhost:3000' });

  if (init.origin !== null) headers.set('origin', init.origin ?? ORIGIN);
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  // A distinct IP per caller keeps one suite's rate limits out of another's way.
  headers.set('x-forwarded-for', init.ip ?? '203.0.113.1');

  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
}

export function params(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

export async function readJson<T = Record<string, unknown>>(response: Response): Promise<T> {
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

let userCounter = 0;

export async function createUser(overrides: Partial<{ email: string; password: string; displayName: string; timezone: string }> = {}): Promise<UserRow> {
  userCounter += 1;
  return registerUser({
    email: overrides.email ?? `user${userCounter}-${randomUUID().slice(0, 8)}@example.com`,
    password: overrides.password ?? 'correct-horse-battery',
    displayName: overrides.displayName ?? `User ${userCounter}`,
    timezone: overrides.timezone ?? 'UTC',
  });
}

/** Puts a real session cookie in the jar, as a browser would hold one. */
export async function signIn(user: UserRow): Promise<string> {
  const { token } = await createSession(user.id);
  setCookie(SESSION_COOKIE, token);
  return token;
}

export function signOut(): void {
  clearCookieJar();
}

export const VALID_PASSWORD = 'correct-horse-battery';
