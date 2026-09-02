import { cn } from '@/lib/cn';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-surface p-5 shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-shimmer rounded-md bg-bg-subtle', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-bg-subtle text-faint">{icon}</div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
