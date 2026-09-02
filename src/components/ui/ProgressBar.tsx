import { cn } from '@/lib/cn';

export type ProgressBarProps = {
  value: number;
  max: number;
  label: string;
  tone?: 'accent' | 'ember' | 'success';
  size?: 'sm' | 'md';
  className?: string;
};

const TONES = {
  accent: 'bg-accent',
  ember: 'bg-ember',
  success: 'bg-success',
} as const;

export function ProgressBar({ value, max, label, tone = 'accent', size = 'md', className }: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = (clamped / safeMax) * 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={label}
      className={cn(
        'w-full overflow-hidden rounded-full bg-bg-subtle',
        size === 'sm' ? 'h-1.5' : 'h-2.5',
        className,
      )}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', TONES[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
