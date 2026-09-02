'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { addDays } from '@/lib/dates';
import { XP_BY_PRIORITY } from '@/lib/xp';
import type { Task, TaskPriority } from '@/types';
import type { NewTaskInput } from './task-store';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'data-[active=true]:bg-priority-low-soft data-[active=true]:text-priority-low',
  medium: 'data-[active=true]:bg-priority-medium-soft data-[active=true]:text-priority-medium',
  high: 'data-[active=true]:bg-priority-high-soft data-[active=true]:text-priority-high',
};

function PrioritySelect({ value, onChange }: { value: TaskPriority; onChange: (priority: TaskPriority) => void }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[13px] font-medium text-muted">Priority</span>
      <div role="radiogroup" aria-label="Priority" className="flex gap-1.5 rounded-lg bg-bg-subtle p-1">
        {PRIORITIES.map((priority) => (
          <button
            key={priority}
            type="button"
            role="radio"
            aria-checked={value === priority}
            data-active={value === priority}
            onClick={() => onChange(priority)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-[13px] font-medium capitalize text-muted transition-colors',
              'hover:text-text data-[active=true]:shadow-card',
              PRIORITY_STYLES[priority],
            )}
          >
            {priority}
            <span className="ml-1 text-[11px] opacity-60">+{XP_BY_PRIORITY[priority]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const value = raw.trim().toLowerCase().replace(/^#/, '');
    if (!value) return;
    if (!/^[a-z0-9][a-z0-9 _-]{0,23}$/.test(value)) return;
    if (tags.includes(value) || tags.length >= 8) return;
    onChange([...tags, value]);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="task-tags" className="block text-[13px] font-medium text-muted">
        Tags
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 focus-within:border-accent">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[12px] font-medium text-accent"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((item) => item !== tag))}
              aria-label={`Remove tag ${tag}`}
              className="rounded-sm opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id="task-tags"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              commit(draft);
              setDraft('');
            } else if (event.key === 'Backspace' && !draft && tags.length > 0) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => {
            commit(draft);
            setDraft('');
          }}
          placeholder={tags.length ? '' : 'work, personal…'}
          className="min-w-[110px] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-faint"
        />
      </div>
    </div>
  );
}

export type TaskEditorProps = {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaults?: Partial<NewTaskInput>;
  onSubmit: (input: NewTaskInput) => Promise<boolean>;
};

export function TaskEditor({ open, onClose, task, defaults, onSubmit }: TaskEditorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (!open) {
      initialised.current = false;
      return;
    }
    if (initialised.current) return;
    initialised.current = true;

    setTitle(task?.title ?? defaults?.title ?? '');
    setDescription(task?.description ?? defaults?.description ?? '');
    setPriority(task?.priority ?? defaults?.priority ?? 'medium');
    setDueDate(task?.dueDate ?? defaults?.dueDate ?? '');
    setTags(task?.tags ?? defaults?.tags ?? []);
    setError(null);
  }, [open, task, defaults]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Give the task a title.');
      return;
    }
    setSaving(true);
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      dueDate: dueDate || null,
      tags,
    });
    setSaving(false);
    if (ok) onClose();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(null);
          }}
          error={error ?? undefined}
          placeholder="What needs doing?"
          maxLength={200}
          autoComplete="off"
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Any details worth keeping."
          maxLength={5000}
        />

        <PrioritySelect value={priority} onChange={setPriority} />

        <div className="space-y-1.5">
          <label htmlFor="task-due" className="block text-[13px] font-medium text-muted">
            Due date
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
            />
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant="ghost" onClick={() => setDueDate(today)}>
                Today
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDueDate(addDays(today, 1))}>
                Tomorrow
              </Button>
              {dueDate && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setDueDate('')}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <TagInput tags={tags} onChange={setTags} />

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {task ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
