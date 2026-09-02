import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', async () => (await import('../helpers/cookies')).nextHeaders);

const { createUser, params, readJson, req, signIn } = await import('../helpers/harness');
const { db } = await import('@/db/client');
const { users } = await import('@/db/schema');
const { addDays, localDateIn } = await import('@/lib/dates');
const { createTask } = await import('@/server/tasks');
const { currentStreak } = await import('@/server/stats');
const completeRoute = await import('@/app/api/tasks/[id]/complete/route');
const statsRoute = await import('@/app/api/stats/route');

type CompletionBody = {
  xpGained: number;
  level: number;
  streak: { current: number; longest: number; increased: boolean };
};

async function complete(taskId: string, completed = true) {
  const response = await completeRoute.POST(
    req(`/api/tasks/${taskId}/complete`, { method: 'POST', body: { completed } }),
    params(taskId),
  );
  return { status: response.status, body: await readJson<CompletionBody>(response) };
}

async function readUser(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0]!;
}

describe('XP awards', () => {
  it('pays the rate for the task priority', async () => {
    const user = await createUser({ timezone: 'UTC' });
    await signIn(user);

    const low = await createTask(user.id, { title: 'Low', priority: 'low' });
    const medium = await createTask(user.id, { title: 'Medium', priority: 'medium' });
    const high = await createTask(user.id, { title: 'High', priority: 'high' });

    expect((await complete(low.id)).body.xpGained).toBe(10);
    expect((await complete(medium.id)).body.xpGained).toBe(20);
    expect((await complete(high.id)).body.xpGained).toBe(40);

    expect((await readUser(user.id)).xp).toBe(70);
  });

  it('never pays twice for the same task', async () => {
    const user = await createUser({ timezone: 'UTC' });
    await signIn(user);
    const task = await createTask(user.id, { title: 'Recycled', priority: 'high' });

    expect((await complete(task.id)).body.xpGained).toBe(40);
    expect((await readUser(user.id)).xp).toBe(40);

    // Restore it and finish it again — the classic way to farm points.
    await complete(task.id, false);
    const second = await complete(task.id);

    expect(second.body.xpGained).toBe(0);
    expect((await readUser(user.id)).xp).toBe(40);
  });

  it('ignores a completion for a task that is already done', async () => {
    const user = await createUser({ timezone: 'UTC' });
    await signIn(user);
    const task = await createTask(user.id, { title: 'Once', priority: 'medium' });

    await complete(task.id);
    const repeat = await complete(task.id);

    expect(repeat.body.xpGained).toBe(0);
    expect((await readUser(user.id)).xp).toBe(20);
  });

  it('keeps XP already earned when a task is deleted', async () => {
    const user = await createUser({ timezone: 'UTC' });
    await signIn(user);
    const task = await createTask(user.id, { title: 'Gone soon', priority: 'high' });
    await complete(task.id);

    const taskRoute = await import('@/app/api/tasks/[id]/route');
    await taskRoute.DELETE(req(`/api/tasks/${task.id}`, { method: 'DELETE' }), params(task.id));

    expect((await readUser(user.id)).xp).toBe(40);
  });

  it('reports level and today’s totals through the stats endpoint', async () => {
    const user = await createUser({ timezone: 'UTC' });
    await signIn(user);

    for (let index = 0; index < 3; index += 1) {
      const task = await createTask(user.id, { title: `Task ${index}`, priority: 'high' });
      await complete(task.id);
    }

    const response = await statsRoute.GET(req('/api/stats'));
    const { stats } = await readJson<{ stats: Record<string, number> }>(response);

    expect(stats.xp).toBe(120);
    // 100 XP buys level 2, leaving 20 towards the 200 needed for level 3.
    expect(stats.level).toBe(2);
    expect(stats.xpIntoLevel).toBe(20);
    expect(stats.xpForNextLevel).toBe(200);
    expect(stats.completedToday).toBe(3);
    expect(stats.xpToday).toBe(120);
  });
});

describe('daily streak', () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createUser({ timezone: 'UTC' });
    userId = user.id;
    await signIn(user);
  });

  it('starts at one on the first completed task', async () => {
    const task = await createTask(userId, { title: 'First', priority: 'low' });
    const result = await complete(task.id);

    expect(result.body.streak).toMatchObject({ current: 1, increased: true });
    expect((await readUser(userId)).lastCompletedDate).toBe(localDateIn('UTC'));
  });

  it('counts a day once, however many tasks are finished', async () => {
    const first = await createTask(userId, { title: 'One', priority: 'low' });
    const second = await createTask(userId, { title: 'Two', priority: 'low' });

    expect((await complete(first.id)).body.streak.current).toBe(1);
    const again = await complete(second.id);

    expect(again.body.streak.current).toBe(1);
    expect(again.body.streak.increased).toBe(false);
  });

  it('extends a streak that ran yesterday', async () => {
    await db
      .update(users)
      .set({ streakCurrent: 4, streakLongest: 4, lastCompletedDate: addDays(localDateIn('UTC'), -1) })
      .where(eq(users.id, userId));

    const task = await createTask(userId, { title: 'Keeping it up', priority: 'low' });
    const result = await complete(task.id);

    expect(result.body.streak.current).toBe(5);
    expect(result.body.streak.longest).toBe(5);
  });

  it('restarts after a missed day but remembers the best run', async () => {
    await db
      .update(users)
      .set({ streakCurrent: 9, streakLongest: 9, lastCompletedDate: addDays(localDateIn('UTC'), -3) })
      .where(eq(users.id, userId));

    const task = await createTask(userId, { title: 'Back at it', priority: 'low' });
    const result = await complete(task.id);

    expect(result.body.streak.current).toBe(1);
    expect(result.body.streak.longest).toBe(9);
  });

  it('reads as broken once two days have passed, without any cron job', () => {
    const today = '2026-09-02';
    expect(currentStreak({ streakCurrent: 7, lastCompletedDate: today }, today)).toBe(7);
    expect(currentStreak({ streakCurrent: 7, lastCompletedDate: '2026-09-01' }, today)).toBe(7);
    expect(currentStreak({ streakCurrent: 7, lastCompletedDate: '2026-08-31' }, today)).toBe(0);
    expect(currentStreak({ streakCurrent: 0, lastCompletedDate: null }, today)).toBe(0);
  });

  it('uses the user’s own timezone to decide which day it is', async () => {
    // UTC+14: for part of the day this is already tomorrow.
    const traveller = await createUser({ timezone: 'Pacific/Kiritimati' });
    await signIn(traveller);

    const task = await createTask(traveller.id, { title: 'Far east', priority: 'low' });
    await completeRoute.POST(
      req(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        body: { completed: true, timezone: 'Pacific/Kiritimati' },
      }),
      params(task.id),
    );

    const stored = await readUser(traveller.id);
    expect(stored.lastCompletedDate).toBe(localDateIn('Pacific/Kiritimati'));
  });

  it('falls back to a safe timezone when the client sends nonsense', async () => {
    const task = await createTask(userId, { title: 'Bad zone', priority: 'low' });
    const response = await completeRoute.POST(
      req(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        body: { completed: true, timezone: 'Mars/Olympus_Mons' },
      }),
      params(task.id),
    );

    expect(response.status).toBe(200);
    expect((await readUser(userId)).lastCompletedDate).toBe(localDateIn('UTC'));
  });
});
