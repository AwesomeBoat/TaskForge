import { sql } from 'drizzle-orm';
import { afterAll, beforeEach } from 'vitest';

// Imported dynamically so the environment from vitest.config.ts is applied first.
const { db } = await import('@/db/client');
const { resetRateLimits } = await import('@/server/rate-limit');
const { clearCookieJar } = await import('./helpers/cookies');

beforeEach(async () => {
  await db.execute(
    sql`truncate table users, tasks, tags, task_tags, sessions, password_reset_tokens, focus_sessions restart identity cascade`,
  );
  resetRateLimits();
  clearCookieJar();
});

afterAll(async () => {
  const pool = (globalThis as { __taskforgePool?: { end: () => Promise<void> } }).__taskforgePool;
  await pool?.end();
});
