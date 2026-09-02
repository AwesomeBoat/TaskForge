import type { Task, TaskPriority } from '@/types';

export type ViewKey = 'inbox' | 'today' | 'upcoming' | 'completed' | 'important';
export type SortKey = 'created' | 'due' | 'priority' | 'title';
export type SortDirection = 'asc' | 'desc';

export type FilterOptions = {
  view: ViewKey;
  today: string;
  search?: string;
  priority?: TaskPriority | null;
  tag?: string | null;
};

const PRIORITY_RANK: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };

/** Mirrors the server's view definitions so the client can filter without a round trip. */
export function matchesView(task: Task, view: ViewKey, today: string): boolean {
  switch (view) {
    case 'inbox':
      return task.status === 'todo';
    case 'today':
      return task.status === 'todo' && task.dueDate !== null && task.dueDate <= today;
    case 'upcoming':
      return task.status === 'todo' && task.dueDate !== null && task.dueDate > today;
    case 'completed':
      return task.status === 'completed';
    case 'important':
      return task.status === 'todo' && task.priority === 'high';
  }
}

export function filterTasks(tasks: Task[], options: FilterOptions): Task[] {
  const needle = options.search?.trim().toLowerCase();

  return tasks.filter((task) => {
    if (!matchesView(task, options.view, options.today)) return false;
    if (options.priority && task.priority !== options.priority) return false;
    if (options.tag && !task.tags.includes(options.tag)) return false;
    if (needle) {
      const haystack = `${task.title} ${task.description ?? ''} ${task.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export function sortTasks(tasks: Task[], sort: SortKey, direction: SortDirection): Task[] {
  const factor = direction === 'asc' ? 1 : -1;

  return [...tasks].sort((a, b) => {
    switch (sort) {
      case 'title':
        return a.title.localeCompare(b.title) * factor;
      case 'priority':
        return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * factor;
      case 'due': {
        // Undated work sinks to the bottom whichever way the list is sorted.
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate) * factor;
      }
      case 'created':
      default:
        return a.createdAt.localeCompare(b.createdAt) * factor;
    }
  });
}
