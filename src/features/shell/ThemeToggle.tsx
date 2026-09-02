'use client';

import { useEffect } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { applyTheme, storedTheme } from '@/lib/theme';
import { useTaskStore } from '@/features/tasks/task-store';
import type { ThemePreference } from '@/types';

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const ICONS: Record<ThemePreference, React.ComponentType<{ className?: string }>> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle() {
  const { user, updatePreferences } = useTaskStore();
  const preference = user.theme;
  const Icon = ICONS[preference];

  // The pre-paint script reads localStorage; on a device that has never seen
  // this account, fall back to the preference stored on the server.
  useEffect(() => {
    if (storedTheme() === null) applyTheme(preference);
  }, [preference]);

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const cycle = () => {
    const next = NEXT_THEME[preference];
    applyTheme(next);
    void updatePreferences({ theme: next });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={`Theme: ${preference}. Switch to ${NEXT_THEME[preference]}.`}
      title={`Theme: ${preference}`}
    >
      <Icon className="size-4" />
    </Button>
  );
}
