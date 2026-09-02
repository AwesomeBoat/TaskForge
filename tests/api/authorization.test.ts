import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', async () => (await import('../helpers/cookies')).nextHeaders);

const { createUser, params, readJson, req, signIn } = await import('../helpers/harness');
const { createTask, getTask } = await import('@/server/tasks');
const taskRoute = await import('@/app/api/tasks/[id]/route');
const completeRoute = await import('@/app/api/tasks/[id]/complete/route');
const tasksRoute = await import('@/app/api/tasks/route');
const focusRoute = await import('@/app/api/focus-sessions/route');
const meRoute = await import('@/app/api/me/route');

async function twoUsersAndATask() {
  const owner = await createUser({ displayName: 'Owner' });
  const intruder = await createUser({ displayName: 'Intruder' });
  const task = await createTask(owner.id, {
    title: 'Owner private task',
    priority: 'high',
    description: 'Confidential',
    tags: ['secret'],
  });
  return { owner, intruder, task };
}

describe('user data isolation', () => {
  it('hides another user’s task behind the same 404 as a missing one', async () => {
    const { intruder, task } = await twoUsersAndATask();
    await signIn(intruder);

    const response = await taskRoute.GET(req(`/api/tasks/${task.id}`), params(task.id));
    expect(response.status).toBe(404);

    const missing = await taskRoute.GET(
      req('/api/tasks/00000000-0000-4000-8000-000000000000'),
      params('00000000-0000-4000-8000-000000000000'),
    );
    // Identical answers: existence of someone else's data is not disclosed.
    expect(await readJson(response)).toEqual(await readJson(missing));
  });

  it('refuses to update another user’s task', async () => {
    const { owner, intruder, task } = await twoUsersAndATask();
    await signIn(intruder);

    const response = await taskRoute.PATCH(
      req(`/api/tasks/${task.id}`, { method: 'PATCH', body: { title: 'Hijacked' } }),
      params(task.id),
    );

    expect(response.status).toBe(404);
    const untouched = await getTask(owner.id, task.id);
    expect(untouched.title).toBe('Owner private task');
  });

  it('refuses to delete another user’s task', async () => {
    const { owner, intruder, task } = await twoUsersAndATask();
    await signIn(intruder);

    const response = await taskRoute.DELETE(req(`/api/tasks/${task.id}`, { method: 'DELETE' }), params(task.id));

    expect(response.status).toBe(404);
    await expect(getTask(owner.id, task.id)).resolves.toMatchObject({ id: task.id });
  });

  it('refuses to complete another user’s task, so no XP can be farmed from it', async () => {
    const { owner, intruder, task } = await twoUsersAndATask();
    await signIn(intruder);

    const response = await completeRoute.POST(
      req(`/api/tasks/${task.id}/complete`, { method: 'POST', body: { completed: true } }),
      params(task.id),
    );

    expect(response.status).toBe(404);
    const untouched = await getTask(owner.id, task.id);
    expect(untouched.status).toBe('todo');
    expect(untouched.xpAwarded).toBe(0);
  });

  it('lists only the caller’s own tasks', async () => {
    const { intruder } = await twoUsersAndATask();
    await createTask(intruder.id, { title: 'My own task', priority: 'low' });
    await signIn(intruder);

    const response = await tasksRoute.GET(req('/api/tasks'));
    const body = await readJson<{ tasks: Array<{ title: string }> }>(response);

    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0]?.title).toBe('My own task');
  });

  it('refuses to attach a focus session to another user’s task', async () => {
    const { intruder, task } = await twoUsersAndATask();
    await signIn(intruder);

    const response = await focusRoute.POST(
      req('/api/focus-sessions', {
        method: 'POST',
        body: {
          taskId: task.id,
          durationSeconds: 1500,
          completed: true,
          startedAt: new Date().toISOString(),
        },
      }),
    );

    expect(response.status).toBe(404);
  });
});

describe('mass assignment', () => {
  it('rejects fields the client has no business setting', async () => {
    const owner = await createUser();
    const task = await createTask(owner.id, { title: 'Mine', priority: 'low' });
    await signIn(owner);

    for (const body of [{ status: 'completed' }, { xpAwarded: 9999 }, { userId: owner.id }, { id: task.id }]) {
      const response = await taskRoute.PATCH(
        req(`/api/tasks/${task.id}`, { method: 'PATCH', body }),
        params(task.id),
      );
      expect(response.status).toBe(400);
    }

    const stored = await getTask(owner.id, task.id);
    expect(stored.status).toBe('todo');
    expect(stored.xpAwarded).toBe(0);
  });

  it('will not let preferences carry an XP or email change', async () => {
    const user = await createUser();
    await signIn(user);

    const response = await meRoute.PATCH(
      req('/api/me', { method: 'PATCH', body: { theme: 'dark', xp: 100_000, email: 'new@example.com' } }),
    );

    expect(response.status).toBe(400);
  });
});
