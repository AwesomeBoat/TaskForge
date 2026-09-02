import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', async () => (await import('../helpers/cookies')).nextHeaders);

const { createUser, readJson, req, signIn } = await import('../helpers/harness');
const { createTask } = await import('@/server/tasks');
const focusRoute = await import('@/app/api/focus-sessions/route');

type Summary = { sessions: number; minutes: number };

async function record(body: Record<string, unknown>) {
  return focusRoute.POST(req('/api/focus-sessions', { method: 'POST', body }));
}

async function summary(): Promise<Summary> {
  const response = await focusRoute.GET(req('/api/focus-sessions'));
  return (await readJson<{ summary: Summary }>(response)).summary;
}

describe('focus sessions', () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createUser({ timezone: 'UTC' });
    userId = user.id;
    await signIn(user);
  });

  it('records a completed block against a task', async () => {
    const task = await createTask(userId, { title: 'Deep work', priority: 'high' });

    const response = await record({
      taskId: task.id,
      durationSeconds: 1500,
      completed: true,
      startedAt: new Date(Date.now() - 1500 * 1000).toISOString(),
    });

    expect(response.status).toBe(201);
    expect(await summary()).toEqual({ sessions: 1, minutes: 25 });
  });

  it('accepts a block with no task attached', async () => {
    const response = await record({
      taskId: null,
      durationSeconds: 1500,
      completed: true,
      startedAt: new Date().toISOString(),
    });

    expect(response.status).toBe(201);
    expect((await summary()).sessions).toBe(1);
  });

  it('keeps abandoned blocks out of the totals', async () => {
    await record({ taskId: null, durationSeconds: 240, completed: false, startedAt: new Date().toISOString() });

    expect(await summary()).toEqual({ sessions: 0, minutes: 0 });
  });

  it('rejects durations outside a plausible range', async () => {
    const startedAt = new Date().toISOString();

    expect((await record({ durationSeconds: 0, completed: true, startedAt })).status).toBe(400);
    expect((await record({ durationSeconds: 60 * 60 * 9, completed: true, startedAt })).status).toBe(400);
    expect((await record({ durationSeconds: 1500, completed: true, startedAt: 'not-a-date' })).status).toBe(400);
  });

  it('needs a session of its own', async () => {
    const { signOut } = await import('../helpers/harness');
    signOut();

    const response = await record({
      taskId: null,
      durationSeconds: 1500,
      completed: true,
      startedAt: new Date().toISOString(),
    });

    expect(response.status).toBe(401);
  });
});
