'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTaskStore } from '@/features/tasks/task-store';
import type { ThemePreference } from '@/types';

export default function SettingsPage() {
  const { user, updatePreferences } = useTaskStore();
  const [name, setName] = useState(user.displayName);
  const [theme, setTheme] = useState<ThemePreference>(user.theme);
  const [sound, setSound] = useState(user.soundEnabled);
  const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); await updatePreferences({ displayName: name, theme, soundEnabled: sound }); const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('taskforge-theme', theme); setSaving(false); }
  return <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-24 pt-8 sm:px-6 sm:pb-10"><header><p className="text-sm font-semibold tracking-[0.14em] text-accent">SETTINGS</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">Make it yours.</h1></header><Card className="space-y-5"><div><label htmlFor="display-name" className="mb-1.5 block text-sm font-medium text-muted">Display name</label><input id="display-name" value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm" /></div><div><p className="mb-1.5 text-sm font-medium text-muted">Theme</p><div className="flex gap-2">{(['system', 'light', 'dark'] as ThemePreference[]).map((item) => <button type="button" key={item} onClick={() => setTheme(item)} className={`rounded-lg border px-3 py-2 text-sm capitalize ${theme === item ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted'}`}>{item}</button>)}</div></div><label className="flex items-center justify-between border-t border-border pt-5 text-sm text-text">Completion sound<input type="checkbox" checked={sound} onChange={(event) => setSound(event.target.checked)} className="size-4 accent-[var(--accent)]" /></label><div className="flex justify-end"><Button onClick={() => void save()} loading={saving}>Save changes</Button></div><p className="text-xs text-faint">Signed in as {user.email}</p></Card></div>;
}
