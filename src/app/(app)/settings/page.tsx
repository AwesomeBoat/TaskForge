'use client';

import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { applyTheme } from '@/lib/theme';
import { useTaskStore } from '@/features/tasks/task-store';
import type { ThemePreference } from '@/types';

const THEMES: Array<{ value: ThemePreference; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export default function SettingsPage() {
  const { user, updatePreferences } = useTaskStore();
  const toast = useToast();
  const [name, setName] = useState(user.displayName);
  const [saving, setSaving] = useState(false);

  /** Theme is applied and stored the moment it is picked — no Save round trip. */
  const chooseTheme = (theme: ThemePreference) => {
    applyTheme(theme);
    void updatePreferences({ theme });
  };

  const saveProfile = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Your name cannot be empty.');
      return;
    }
    setSaving(true);
    await updatePreferences({ displayName: trimmed });
    setSaving(false);
    toast.success('Saved.');
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-24 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
      <header>
        <p className="text-sm font-semibold tracking-[0.14em] text-accent">SETTINGS</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">Make it yours.</h1>
      </header>

      <Card className="space-y-5">
        <h2 className="text-[15px] font-semibold text-text">Profile</h2>

        <Input
          label="Display name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          hint={`Signed in as ${user.email}`}
        />

        <div className="flex justify-end">
          <Button variant="primary" onClick={() => void saveProfile()} loading={saving}>
            Save changes
          </Button>
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-[15px] font-semibold text-text">Appearance</h2>

        <div className="space-y-2">
          <span className="block text-[13px] font-medium text-muted">Theme</span>
          <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={user.theme === value}
                onClick={() => chooseTheme(value)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                  user.theme === value
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-muted hover:border-border-strong hover:text-text',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-border pt-5">
          <span>
            <span className="block text-sm text-text">Completion sound</span>
            <span className="block text-[12px] text-muted">A short chime when you finish a task.</span>
          </span>
          <input
            type="checkbox"
            checked={user.soundEnabled}
            onChange={(event) => void updatePreferences({ soundEnabled: event.target.checked })}
            className="size-4 accent-[var(--accent)]"
          />
        </label>
      </Card>
    </div>
  );
}
