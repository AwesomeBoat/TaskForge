'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export type DropdownItem = {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  selected?: boolean;
  tone?: 'default' | 'danger';
};

export type DropdownProps = {
  label: string;
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => React.ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'end';
  className?: string;
};

export function Dropdown({ label, trigger, items, align = 'end', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => {
          const next = event.key === 'ArrowDown' ? current + 1 : current - 1;
          const wrapped = (next + items.length) % items.length;
          itemRefs.current[wrapped]?.focus();
          return wrapped;
        });
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, items.length]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((value) => !value), id: triggerId })}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            'absolute z-50 mt-1.5 min-w-[190px] overflow-hidden rounded-lg border border-border bg-surface-raised p-1 shadow-float animate-rise',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              onFocus={() => setActiveIndex(index)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                item.tone === 'danger' ? 'text-danger hover:bg-danger-soft' : 'text-text hover:bg-bg-subtle',
                activeIndex === index && 'bg-bg-subtle',
              )}
            >
              {item.icon && <span className="text-faint">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
              {item.selected && <Check className="size-3.5 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
