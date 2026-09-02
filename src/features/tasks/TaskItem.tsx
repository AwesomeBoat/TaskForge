'use client';

import { memo } from 'react';
import { CalendarClock, MoreHorizontal, Pencil, Timer, Trash2 } from 'lucide-react';
import { Badge, PriorityBadge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/lib/cn';
import { daysBetween, formatDueDate } from '@/lib/dates';
import { XP_BY_PRIORITY } from '@/lib/xp';
import type { Task } from '@/types';

export type TaskItemProps = {
  task: Task;
  today: string;
  pending: boolean;
  leaving: boolean;
  onToggle: (completed: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onFocus: () => void;
};

function DueBadge({ dueDate, today, completed }: { dueDate: string; today: string; completed: boolean }) {
  const distance = daysBetween(today, dueDate);
  const tone = completed ? 'neutral' : distance < 0 ? 'danger' : distance === 0 ? 'ember' : 'neutral';

  return (
    <Badge tone={tone}>
      <CalendarClock aria-hidden className="size-3" />
      {formatDueDate(dueDate, today)}
    </Badge>
  );
}

export const TaskItem = memo(function TaskItem({
  task,
  today,
  pending,
  leaving,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
}: TaskItemProps) {
  const completed = task.status === 'completed';

  return (
    <li
      className={cn(
        'group relative flex gap-3 rounded-lg border border-transparent px-2.5 py-2.5 transition-all duration-200',
        'hover:border-border hover:bg-surface',
        pending && 'opacity-60',
        leaving && 'pointer-events-none translate-x-1 scale-[0.99] opacity-0',
      )}
    >
      <div className="pt-0.5">
        <Checkbox
          checked={completed}
          onChange={onToggle}
          disabled={pending}
          tone={completed ? 'success' : 'accent'}
          label={completed ? `Restore ${task.title}` : `Complete ${task.title}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onEdit}
            className={cn(
              'min-w-0 flex-1 text-left text-[14px] leading-6 transition-colors',
              completed ? 'text-faint line-through decoration-faint/60' : 'text-text hover:text-accent',
            )}
          >
            {task.title}
          </button>

          <Dropdown
            label={`Actions for ${task.title}`}
            align="end"
            items={[
              { label: 'Edit task', icon: <Pencil className="size-3.5" />, onSelect: onEdit },
              ...(completed ? [] : [{ label: 'Focus on this', icon: <Timer className="size-3.5" />, onSelect: onFocus }]),
              { label: 'Delete', icon: <Trash2 className="size-3.5" />, onSelect: onDelete, tone: 'danger' as const },
            ]}
            trigger={({ toggle, open }) => (
              <button
                type="button"
                onClick={toggle}
                aria-label={`Actions for ${task.title}`}
                aria-haspopup="menu"
                aria-expanded={open}
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-md text-faint transition-all',
                  'hover:bg-bg-subtle hover:text-text focus-visible:opacity-100',
                  open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 sm:opacity-0',
                )}
              >
                <MoreHorizontal className="size-4" />
              </button>
            )}
          />
        </div>

        {task.description && !completed && (
          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{task.description}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {!completed && <PriorityBadge priority={task.priority} />}
          {task.dueDate && <DueBadge dueDate={task.dueDate} today={today} completed={completed} />}
          {task.tags.map((tag) => (
            <Badge key={tag} tone="accent">
              #{tag}
            </Badge>
          ))}
          {!completed && (
            <span className="ml-auto hidden text-[11px] font-medium text-faint transition-opacity group-hover:inline sm:inline sm:opacity-0 sm:group-hover:opacity-100">
              +{XP_BY_PRIORITY[task.priority]} XP
            </span>
          )}
        </div>
      </div>
    </li>
  );
});
