'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, CheckCircle2, Filter, Inbox, Search, Sparkles, Sun, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Card';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/lib/cn';
import type { TaskPriority } from '@/types';
import { filterTasks, sortTasks, type SortDirection, type SortKey, type ViewKey } from './filters';
import { QuickAdd } from './QuickAdd';
import { TaskList } from './TaskList';
import { useTaskStore } from './task-store';

const SORT_LABELS: Record<SortKey, string> = {
  created: 'Date created',
  due: 'Due date',
  priority: 'Priority',
  title: 'Title',
};

const EMPTY_COPY: Record<ViewKey, { icon: React.ReactNode; title: string; description: string }> = {
  inbox: {
    icon: <Inbox className="size-5" />,
    title: 'Inbox zero',
    description: 'Nothing waiting on you. Add the next thing when it turns up.',
  },
  today: {
    icon: <Sun className="size-5" />,
    title: 'Nothing due today',
    description: 'Your day is clear. Pull something forward if you feel like getting ahead.',
  },
  upcoming: {
    icon: <Sparkles className="size-5" />,
    title: 'No plans yet',
    description: 'Tasks with a future due date will show up here.',
  },
  completed: {
    icon: <CheckCircle2 className="size-5" />,
    title: 'No history yet',
    description: 'Finished tasks collect here so you can see what you got through.',
  },
  important: {
    icon: <Sparkles className="size-5" />,
    title: 'Nothing urgent',
    description: 'High priority tasks appear here the moment you flag one.',
  },
};

export function TaskView({ view, title, subtitle }: { view: ViewKey; title: string; subtitle?: string }) {
  const { tasks, tags, today, clearCompleted } = useTaskStore();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>(view === 'completed' ? 'created' : 'due');
  const [direction, setDirection] = useState<SortDirection>(view === 'completed' ? 'desc' : 'asc');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const visible = useMemo(() => {
    const filtered = filterTasks(tasks, { view, today, search, priority, tag });
    return sortTasks(filtered, sort, direction);
  }, [direction, priority, search, sort, tag, tasks, today, view]);

  const hasFilters = Boolean(search || priority || tag);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-24 pt-6 sm:px-6 sm:pb-10">
      <header className="space-y-1">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-text">{title}</h1>
          <span className="text-sm text-faint tabular-nums">{visible.length}</span>
          {view === 'completed' && visible.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => void clearCompleted()}
              aria-label="Clear completed history"
            >
              <Trash2 className="size-3.5" />
              Clear history
            </Button>
          )}
        </div>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </header>

      {view !== 'completed' && <QuickAdd defaultDueDate={view === 'today' ? today : null} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search aria-hidden className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setSearch('')}
            placeholder="Search tasks"
            aria-label="Search tasks"
            aria-keyshortcuts="/"
            className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-8 text-[13px] outline-none transition-colors hover:border-border-strong focus:border-accent"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint hover:text-text"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Dropdown
          label="Filter by priority"
          items={[
            { label: 'All priorities', onSelect: () => setPriority(null), selected: priority === null },
            { label: 'High', onSelect: () => setPriority('high'), selected: priority === 'high' },
            { label: 'Medium', onSelect: () => setPriority('medium'), selected: priority === 'medium' },
            { label: 'Low', onSelect: () => setPriority('low'), selected: priority === 'low' },
          ]}
          trigger={({ toggle, open }) => (
            <Button variant="secondary" size="sm" onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
              <Filter className="size-3.5" />
              <span className="capitalize">{priority ?? 'Priority'}</span>
            </Button>
          )}
        />

        {tags.length > 0 && (
          <Dropdown
            label="Filter by tag"
            items={[
              { label: 'All tags', onSelect: () => setTag(null), selected: tag === null },
              ...tags.map((name) => ({
                label: `#${name}`,
                onSelect: () => setTag(name),
                selected: tag === name,
              })),
            ]}
            trigger={({ toggle, open }) => (
              <Button variant="secondary" size="sm" onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
                {tag ? `#${tag}` : 'Tags'}
              </Button>
            )}
          />
        )}

        <Dropdown
          label="Sort tasks"
          items={[
            ...(Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
              label: SORT_LABELS[key],
              onSelect: () => setSort(key),
              selected: sort === key,
            })),
            {
              label: direction === 'asc' ? 'Switch to descending' : 'Switch to ascending',
              onSelect: () => setDirection((current) => (current === 'asc' ? 'desc' : 'asc')),
            },
          ]}
          trigger={({ toggle, open }) => (
            <Button variant="secondary" size="sm" onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
              <ArrowUpDown className="size-3.5" />
              <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
            </Button>
          )}
        />
      </div>

      <TaskList
        tasks={visible}
        empty={
          hasFilters ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="No matches"
              description="Nothing here fits those filters. Try a different search or clear them."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setPriority(null);
                    setTag(null);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState {...EMPTY_COPY[view]} />
          )
        }
      />

      <p className={cn('px-1 text-[11px] text-faint', visible.length === 0 && 'hidden')}>
        Press <kbd className="rounded border border-border px-1 font-mono">N</kbd> to add a task,{' '}
        <kbd className="rounded border border-border px-1 font-mono">/</kbd> to search.
      </p>
    </div>
  );
}
