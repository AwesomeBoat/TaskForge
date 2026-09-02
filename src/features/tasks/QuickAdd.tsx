'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Plus, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatDueDate } from '@/lib/dates';
import { parseQuickAdd } from './quick-add';
import { TaskEditor } from './TaskEditor';
import { useTaskStore } from './task-store';
import type { NewTaskInput } from './task-store';

/** Ignore hotkeys while the user is typing somewhere else. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

export function QuickAdd({ defaultDueDate = null }: { defaultDueDate?: string | null }) {
  const { createTask, today } = useTaskStore();
  const [value, setValue] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => (value.trim() ? parseQuickAdd(value, today) : null), [value, today]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const submit = useCallback(async () => {
    if (!parsed || submitting) return;
    setSubmitting(true);
    const created = await createTask({
      title: parsed.title,
      priority: parsed.priority,
      dueDate: parsed.dueDate ?? defaultDueDate,
      tags: parsed.tags,
    });
    setSubmitting(false);
    if (created) setValue('');
    inputRef.current?.focus();
  }, [createTask, defaultDueDate, parsed, submitting]);

  const openEditor = () => setEditorOpen(true);

  const editorDefaults: Partial<NewTaskInput> = parsed
    ? { title: parsed.title, priority: parsed.priority, dueDate: parsed.dueDate ?? defaultDueDate, tags: parsed.tags }
    : { priority: 'medium', dueDate: defaultDueDate };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-2 shadow-card',
          'transition-shadow duration-200 focus-within:border-accent focus-within:shadow-accent',
        )}
      >
        <Plus aria-hidden className="ml-0.5 size-4 shrink-0 text-faint" />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submit();
            } else if (event.key === 'Escape') {
              setValue('');
              inputRef.current?.blur();
            }
          }}
          placeholder="Add a task…  try “Ship landing page tomorrow #work !high”"
          aria-label="Add a task"
          aria-keyshortcuts="n"
          maxLength={300}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-text outline-none placeholder:text-faint"
        />

        <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-faint sm:block">
          N
        </kbd>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={openEditor}
          aria-label="Open full task form"
          title="More options"
        >
          <Settings2 className="size-4" />
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={() => void submit()} disabled={!parsed || submitting}>
          Add
        </Button>
      </div>

      {parsed && (parsed.dueDate || parsed.tags.length > 0 || parsed.priority !== 'medium') && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 animate-fade">
          <span className="text-[11px] text-faint">Will be saved as</span>
          <Badge tone={parsed.priority}>{parsed.priority}</Badge>
          {parsed.dueDate && (
            <Badge tone="neutral">
              <CalendarClock aria-hidden className="size-3" />
              {formatDueDate(parsed.dueDate, today)}
            </Badge>
          )}
          {parsed.tags.map((tag) => (
            <Badge key={tag} tone="accent">
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      <TaskEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        defaults={editorDefaults}
        onSubmit={async (input) => {
          const ok = await createTask(input);
          if (ok) setValue('');
          return ok;
        }}
      />
    </div>
  );
}
