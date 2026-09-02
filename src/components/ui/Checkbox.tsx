'use client';

import { cn } from '@/lib/cn';

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
  tone?: 'accent' | 'success';
  disabled?: boolean;
};

/**
 * A button with `role="checkbox"` rather than a styled input: it keeps full
 * keyboard semantics while letting the tick draw itself in.
 */
export function Checkbox({ checked, onChange, label, className, tone = 'accent', disabled }: CheckboxProps) {
  const activeTone = tone === 'success' ? 'border-success bg-success' : 'border-accent bg-accent';

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'group relative grid size-[19px] shrink-0 place-items-center rounded-[7px] border-[1.5px]',
        'transition-all duration-200 disabled:opacity-50',
        checked ? activeTone : 'border-border-strong hover:border-accent hover:bg-accent-soft',
        className,
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-[13px]">
        <path
          d="M3.5 8.4L6.3 11.2L12.5 5"
          stroke="var(--accent-contrast)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={checked ? 0 : 1}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>
    </button>
  );
}
