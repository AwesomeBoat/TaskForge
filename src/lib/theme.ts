import type { ThemePreference } from '@/types';

export const THEME_STORAGE_KEY = 'taskforge-theme';

export function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return prefersDark() ? 'dark' : 'light';
  return preference;
}

/** Single place that touches `data-theme`, shared by the toggle and settings. */
export function applyTheme(preference: ThemePreference): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = resolveTheme(preference);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode and blocked storage are fine; the preference still lives server-side.
  }
}

export function storedTheme(): ThemePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : null;
  } catch {
    return null;
  }
}
