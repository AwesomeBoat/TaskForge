import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', async () => (await import('../helpers/cookies')).nextHeaders);

const { getCookie } = await import('../helpers/cookies');
const { createUser, readJson, req, signOut, VALID_PASSWORD } = await import('../helpers/harness');
const { SESSION_COOKIE } = await import('@/server/session');

const signup = (await import('@/app/api/auth/signup/route')).POST;
const login = (await import('@/app/api/auth/login/route')).POST;
const logout = (await import('@/app/api/auth/logout/route')).POST;
const listTasks = (await import('@/app/api/tasks/route')).GET;

describe('signup', () => {
  beforeEach(signOut);

  it('creates an account and starts a session', async () => {
    const response = await signup(
      req('/api/auth/signup', {
        method: 'POST',
        body: { email: 'New.User@Example.com ', password: VALID_PASSWORD, displayName: 'New User' },
      }),
    );

    expect(response.status).toBe(201);
    const body = await readJson<{ user: { email: string; displayName: string } }>(response);
    // Emails are normalised before they ever reach the database.
    expect(body.user.email).toBe('new.user@example.com');
    expect(getCookie(SESSION_COOKIE)).toBeTypeOf('string');
  });

  it('never returns the password hash', async () => {
    const response = await signup(
      req('/api/auth/signup', {
        method: 'POST',
        body: { email: 'leak@example.com', password: VALID_PASSWORD, displayName: 'Leak' },
      }),
    );
    const raw = JSON.stringify(await readJson(response));
    expect(raw).not.toContain('scrypt');
    expect(raw.toLowerCase()).not.toContain('passwordhash');
  });

  it('rejects a short password and an invalid email', async () => {
    const short = await signup(
      req('/api/auth/signup', {
        method: 'POST',
        body: { email: 'someone@example.com', password: 'short', displayName: 'Someone' },
      }),
    );
    expect(short.status).toBe(400);

    const bad = await signup(
      req('/api/auth/signup', {
        method: 'POST',
        body: { email: 'not-an-email', password: VALID_PASSWORD, displayName: 'Someone' },
      }),
    );
    expect(bad.status).toBe(400);
  });

  it('refuses a duplicate email', async () => {
    await createUser({ email: 'taken@example.com' });
    const response = await signup(
      req('/api/auth/signup', {
        method: 'POST',
        body: { email: 'taken@example.com', password: VALID_PASSWORD, displayName: 'Copy' },
      }),
    );
    expect(response.status).toBe(409);
  });

  it('rejects extra fields instead of trusting them', async () => {
    const response = await signup(
      req('/api/auth/signup', {
        method: 'POST',
        body: { email: 'mass@example.com', password: VALID_PASSWORD, displayName: 'Mass', xp: 99_999 },
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe('login', () => {
  beforeEach(signOut);

  it('signs in with the right password', async () => {
    await createUser({ email: 'member@example.com', password: VALID_PASSWORD });

    const response = await login(
      req('/api/auth/login', {
        method: 'POST',
        body: { email: 'member@example.com', password: VALID_PASSWORD },
      }),
    );

    expect(response.status).toBe(200);
    expect(getCookie(SESSION_COOKIE)).toBeTypeOf('string');
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    await createUser({ email: 'member2@example.com', password: VALID_PASSWORD });

    const wrongPassword = await login(
      req('/api/auth/login', { method: 'POST', body: { email: 'member2@example.com', password: 'nope-nope-nope' } }),
    );
    const unknownAccount = await login(
      req('/api/auth/login', { method: 'POST', body: { email: 'ghost@example.com', password: 'nope-nope-nope' } }),
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownAccount.status).toBe(401);
    expect(await readJson(wrongPassword)).toEqual(await readJson(unknownAccount));
    expect(getCookie(SESSION_COOKIE)).toBeUndefined();
  });

  it('rate limits repeated attempts on one account', async () => {
    await createUser({ email: 'target@example.com', password: VALID_PASSWORD });

    let lastStatus = 0;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await login(
        req('/api/auth/login', {
          method: 'POST',
          body: { email: 'target@example.com', password: 'wrong-password-here' },
          // Vary the IP so it is the per-account limit being proven, not the per-IP one.
          ip: `198.51.100.${attempt}`,
        }),
      );
      lastStatus = response.status;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).toBe(429);
  });
});

describe('logout', () => {
  it('ends the session for good', async () => {
    const user = await createUser();
    const { signIn } = await import('../helpers/harness');
    await signIn(user);

    expect((await listTasks(req('/api/tasks'))).status).toBe(200);

    const response = await logout(req('/api/auth/logout', { method: 'POST' }));
    expect(response.status).toBe(200);
    expect(getCookie(SESSION_COOKIE)).toBeUndefined();

    expect((await listTasks(req('/api/tasks'))).status).toBe(401);
  });
});

describe('unauthenticated access', () => {
  beforeEach(signOut);

  it('refuses private endpoints without a session', async () => {
    expect((await listTasks(req('/api/tasks'))).status).toBe(401);
  });

  it('refuses a stale session token', async () => {
    const { setCookie } = await import('../helpers/cookies');
    setCookie(SESSION_COOKIE, 'not-a-real-token');
    expect((await listTasks(req('/api/tasks'))).status).toBe(401);
  });
});

describe('CSRF protection', () => {
  it('blocks state changes with a missing or foreign origin', async () => {
    const missing = await signup(
      req('/api/auth/signup', {
        method: 'POST',
        origin: null,
        body: { email: 'csrf1@example.com', password: VALID_PASSWORD, displayName: 'CSRF' },
      }),
    );
    expect(missing.status).toBe(403);

    const foreign = await signup(
      req('/api/auth/signup', {
        method: 'POST',
        origin: 'https://evil.example.com',
        body: { email: 'csrf2@example.com', password: VALID_PASSWORD, displayName: 'CSRF' },
      }),
    );
    expect(foreign.status).toBe(403);
  });
});
