import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', async () => (await import('../helpers/cookies')).nextHeaders);

const { createUser, params, readJson, req, signIn } = await import('../helpers/harness');
const { addDays, localDateIn } = await import('@/lib/dates');
const tasksRoute = await import('@/app/api/tasks/route');
const taskRoute = await import('@/app/api/tasks/[id]/route');
const completeRoute = await import('@/app/api/tasks/[id]/complete/route');
const completedRoute = await import('@/app/api/tasks/completed/route');

type TaskBody = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  tags: string[];
};

const today = () => localDateIn('UTC');

async function create(body: Record<string, unknown>) {
  const response = await tasksRoute.POST(req('/api/tasks', { method: 'POST', body }));
  return { response, body: await readJson<{ task: TaskBody }>(response) };
}

async function list(query = '') {
  const response = await tasksRoute.GET(req(`/api/tasks${query}`));
  return (await readJson<{ tasks: TaskBody[] }>(response)).tasks;
}

describe('task CRUD', () => {
  beforeEach(async () => {
    const user = await createUser({ timezone: 'UTC' });
    await signIn(user);
  });

  it('creates a task with tags, priority and a due date', async () => {
    const { response, body } = await create({
      title: '  Ship the landing page  ',
      description: 'Above the fold first',
      priority: 'high',
      dueDate: today(),
      tags: ['work', 'web'],
    });

    expect(response.status).toBe(201);
    expect(body.task.title).toBe('Ship the landing page');
    expect(body.task.priority).toBe('high');
    expect(body.task.tags).toEqual(['web', 'work']);
    expect(body.task.status).toBe('todo');
  });

  it('rejects an empty title and an impossible date', async () => {
    expect((await create({ title: '   ' })).response.status).toBe(400);
    expect((await create({ title: 'Bad date', dueDate: '2026-02-30' })).response.status).toBe(400);
  });

  it('updates fields and replaces tags', async () => {
    const { body } = await create({ title: 'Draft', priority: 'low', tags: ['old'] });

    const response = await taskRoute.PATCH(
      req(`/api/tasks/${body.task.id}`, {
        method: 'PATCH',
        body: { title: 'Final', priority: 'high', tags: ['new'], description: null },
      }),
      params(body.task.id),
    );

    expect(response.status).toBe(200);
    const updated = await readJson<{ task: TaskBody }>(response);
    expect(updated.task.title).toBe('Final');
    expect(updated.task.priority).toBe('high');
    expect(updated.task.tags).toEqual(['new']);
    expect(updated.task.description).toBeNull();
  });

  it('completes and restores a task', async () => {
    const { body } = await create({ title: 'Round trip', priority: 'medium' });

    const completed = await completeRoute.POST(
      req(`/api/tasks/${body.task.id}/complete`, { method: 'POST', body: { completed: true } }),
      params(body.task.id),
    );
    expect((await readJson<{ task: TaskBody }>(completed)).task.status).toBe('completed');

    const restored = await completeRoute.POST(
      req(`/api/tasks/${body.task.id}/complete`, { method: 'POST', body: { completed: false } }),
      params(body.task.id),
    );
    expect((await readJson<{ task: TaskBody }>(restored)).task.status).toBe('todo');
  });

  it('deletes a task', async () => {
    const { body } = await create({ title: 'Temporary' });

    const response = await taskRoute.DELETE(
      req(`/api/tasks/${body.task.id}`, { method: 'DELETE' }),
      params(body.task.id),
    );
    expect(response.status).toBe(200);

    const gone = await taskRoute.GET(req(`/api/tasks/${body.task.id}`), params(body.task.id));
    expect(gone.status).toBe(404);
  });

  it('clears completed history without touching open work', async () => {
    const { body: keep } = await create({ title: 'Still open' });
    const { body: done } = await create({ title: 'Finished' });
    await completeRoute.POST(
      req(`/api/tasks/${done.task.id}/complete`, { method: 'POST', body: { completed: true } }),
      params(done.task.id),
    );

    const response = await completedRoute.DELETE(req('/api/tasks/completed', { method: 'DELETE' }));
    expect(response.status).toBe(200);

    const remaining = await list();
    expect(remaining.map((task) => task.title)).toEqual([keep.task.title]);
  });
});

describe('views, search and sorting', () => {
  beforeEach(async () => {
    const user = await createUser({ timezone: 'UTC' });
    await signIn(user);

    await create({ title: 'Due today', priority: 'low', dueDate: today() });
    await create({ title: 'Overdue report', priority: 'medium', dueDate: addDays(today(), -3) });
    await create({ title: 'Next week trip', priority: 'high', dueDate: addDays(today(), 7), tags: ['travel'] });
    await create({ title: 'Someday idea', priority: 'high' });
  });

  it('treats overdue work as part of today', async () => {
    const titles = (await list('?view=today')).map((task) => task.title);
    expect(titles).toContain('Due today');
    expect(titles).toContain('Overdue report');
    expect(titles).not.toContain('Next week trip');
  });

  it('separates upcoming from today', async () => {
    expect((await list('?view=upcoming')).map((task) => task.title)).toEqual(['Next week trip']);
  });

  it('shows only high priority work in important', async () => {
    const titles = (await list('?view=important')).map((task) => task.title).sort();
    expect(titles).toEqual(['Next week trip', 'Someday idea']);
  });

  it('moves finished work out of the inbox and into completed', async () => {
    const inbox = await list('?view=inbox');
    const target = inbox.find((task) => task.title === 'Due today');
    expect(target).toBeDefined();

    await completeRoute.POST(
      req(`/api/tasks/${target!.id}/complete`, { method: 'POST', body: { completed: true } }),
      params(target!.id),
    );

    expect((await list('?view=inbox')).map((task) => task.title)).not.toContain('Due today');
    expect((await list('?view=completed')).map((task) => task.title)).toEqual(['Due today']);
  });

  it('searches titles and descriptions', async () => {
    expect((await list('?search=report')).map((task) => task.title)).toEqual(['Overdue report']);
    expect(await list('?search=nothing-matches-this')).toHaveLength(0);
  });

  it('treats LIKE wildcards in a search as plain text', async () => {
    // A bare "%" must not behave as "match everything".
    expect(await list('?search=%25')).toHaveLength(0);
  });

  it('filters by priority and tag', async () => {
    expect((await list('?priority=high')).map((task) => task.title).sort()).toEqual([
      'Next week trip',
      'Someday idea',
    ]);
    expect((await list('?tag=travel')).map((task) => task.title)).toEqual(['Next week trip']);
  });

  it('sorts by due date with undated work last, whichever way round', async () => {
    const ascending = (await list('?sort=due&direction=asc')).map((task) => task.title);
    expect(ascending[0]).toBe('Overdue report');
    expect(ascending.at(-1)).toBe('Someday idea');

    const descending = (await list('?sort=due&direction=desc')).map((task) => task.title);
    expect(descending[0]).toBe('Next week trip');
    expect(descending.at(-1)).toBe('Someday idea');
  });

  it('rejects a nonsense query instead of guessing', async () => {
    const response = await tasksRoute.GET(req('/api/tasks?view=everything'));
    expect(response.status).toBe(400);
  });
});
