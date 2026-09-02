import { describe, expect, it } from 'vitest';
import { filterTasks, sortTasks } from '../src/features/tasks/filters';
import type { Task } from '../src/types';

const TODAY = '2026-09-02';

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: 'Task',
    description: null,
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    xpAwarded: 0,
    tags: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

const TASKS: Task[] = [
  task({ id: 'a', title: 'Due today', dueDate: TODAY, priority: 'low' }),
  task({ id: 'b', title: 'Overdue', dueDate: '2026-08-30', priority: 'high' }),
  task({ id: 'c', title: 'Later', dueDate: '2026-09-20', priority: 'medium', tags: ['trip'] }),
  task({ id: 'd', title: 'No date', priority: 'high' }),
  task({ id: 'e', title: 'Finished', status: 'completed', completedAt: '2026-09-01T12:00:00.000Z' }),
];

const idsIn = (view: Parameters<typeof filterTasks>[1]['view']) =>
  filterTasks(TASKS, { view, today: TODAY })
    .map((item) => item.id)
    .sort();

describe('view filters', () => {
  it('matches the server definition of each view', () => {
    expect(idsIn('inbox')).toEqual(['a', 'b', 'c', 'd']);
    expect(idsIn('today')).toEqual(['a', 'b']);
    expect(idsIn('upcoming')).toEqual(['c']);
    expect(idsIn('important')).toEqual(['b', 'd']);
    expect(idsIn('completed')).toEqual(['e']);
  });

  it('searches titles and tags', () => {
    expect(filterTasks(TASKS, { view: 'inbox', today: TODAY, search: 'over' }).map((item) => item.id)).toEqual(['b']);
    expect(filterTasks(TASKS, { view: 'inbox', today: TODAY, search: 'TRIP' }).map((item) => item.id)).toEqual(['c']);
  });

  it('narrows by priority and tag', () => {
    expect(filterTasks(TASKS, { view: 'inbox', today: TODAY, priority: 'high' }).map((item) => item.id)).toEqual([
      'b',
      'd',
    ]);
    expect(filterTasks(TASKS, { view: 'inbox', today: TODAY, tag: 'trip' }).map((item) => item.id)).toEqual(['c']);
  });
});

describe('sorting', () => {
  it('orders by due date and keeps undated work last either way', () => {
    const ascending = sortTasks(TASKS, 'due', 'asc').map((item) => item.id);
    const descending = sortTasks(TASKS, 'due', 'desc').map((item) => item.id);

    expect(ascending[0]).toBe('b');
    expect(ascending.at(-1)).toBe('e');
    expect(descending.at(-1)).toBe('e');
  });

  it('orders by priority', () => {
    expect(sortTasks(TASKS, 'priority', 'desc').slice(0, 2).map((item) => item.priority)).toEqual(['high', 'high']);
  });

  it('leaves the input array untouched', () => {
    const before = TASKS.map((item) => item.id);
    sortTasks(TASKS, 'title', 'asc');
    expect(TASKS.map((item) => item.id)).toEqual(before);
  });
});
