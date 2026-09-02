import { cn } from '@/lib/cn';
import type { TaskPriority } from '@/types';

type Tone = 'neutral' | 'accent' | 'ember' | 'success' | 'danger' | 'low' | 'medium' | 'high';

const TONES: Record<Tone, string> = {
  neutral: 'bg-bg-subtle text-muted',
  accent: 'bg-accent-soft text-accent',
  ember: 'bg-ember-soft text-ember',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  low: 'bg-priority-low-soft text-priority-low',
  medium: 'bg-priority-medium-soft text-priority-medium',
  high: 'bg-priority-high-soft text-priority-high',
};

export type BadgeProps = {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  title?: string;
};

export function Badge({ tone = 'neutral', children, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const PRIORITY_LABEL: Record<TaskPriority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge tone={priority} title={`${PRIORITY_LABEL[priority]} priority`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}
