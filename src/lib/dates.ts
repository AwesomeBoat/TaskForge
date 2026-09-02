/**
 * Calendar-day helpers. Due dates and streaks are day-granular ("YYYY-MM-DD"),
 * which keeps "is this due today?" unambiguous for a user who changes timezone.
 */

export type IsoDate = string; // YYYY-MM-DD

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** The calendar day it currently is for someone in `timezone`. */
export function localDateIn(timezone: string, at: Date = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is in the past. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

/** "Today", "Tomorrow", "3 days overdue", "Mar 14" — relative to the user's own day. */
export function formatDueDate(due: IsoDate, today: IsoDate): string {
  const diff = daysBetween(today, due);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  if (diff < 7) return new Date(`${due}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const sameYear = due.slice(0, 4) === today.slice(0, 4);
  return new Date(`${due}T00:00:00.000Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  });
}

/** The hour of day (0-23) it currently is for someone in `timezone`. */
export function hourIn(timezone: string, at: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).format(at);
  const parsed = Number(hour);
  return Number.isFinite(parsed) ? parsed % 24 : 12;
}

/**
 * Rendered on the server from the user's stored timezone rather than from the
 * browser clock, so the greeting is right on first paint and never rehydrates
 * into a different one.
 */
export function greetingFor(timezone: string, at: Date = new Date()): string {
  const hour = hourIn(timezone, at);
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function longDateIn(timezone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(at);
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
