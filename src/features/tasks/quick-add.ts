import { addDays, isIsoDate } from '@/lib/dates';
import type { TaskPriority } from '@/types';

export type ParsedQuickAdd = {
  title: string;
  priority: TaskPriority;
  dueDate: string | null;
  tags: string[];
};

const PRIORITY_TOKENS: Record<string, TaskPriority> = {
  l: 'low',
  low: 'low',
  m: 'medium',
  med: 'medium',
  medium: 'medium',
  h: 'high',
  high: 'high',
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function weekdayIndexOf(token: string): number {
  const normalised = token.toLowerCase();
  return WEEKDAYS.findIndex((day) => day === normalised || day.slice(0, 3) === normalised);
}

/** Next occurrence of a weekday, always in the future (never "today"). */
function nextWeekday(today: string, weekday: number): string {
  const current = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const delta = (weekday - current + 7) % 7 || 7;
  return addDays(today, delta);
}

type DateMatch = { date: string; start: number; end: number };

function findDate(text: string, today: string): DateMatch | null {
  const patterns: Array<{ re: RegExp; resolve: (match: RegExpExecArray) => string | null }> = [
    { re: /\b(\d{4}-\d{2}-\d{2})\b/i, resolve: (m) => (m[1] && isIsoDate(m[1]) ? m[1] : null) },
    { re: /\b(today|tonight)\b/i, resolve: () => today },
    { re: /\b(tomorrow|tmr)\b/i, resolve: () => addDays(today, 1) },
    { re: /\bnext week\b/i, resolve: () => addDays(today, 7) },
    {
      re: /\bin (\d{1,3}) (day|days|week|weeks)\b/i,
      resolve: (m) => {
        const amount = Number(m[1]);
        if (!Number.isFinite(amount) || amount < 1 || amount > 365) return null;
        return addDays(today, m[2]?.toLowerCase().startsWith('week') ? amount * 7 : amount);
      },
    },
    {
      re: /\b(?:next )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i,
      resolve: (m) => {
        const index = m[1] ? weekdayIndexOf(m[1]) : -1;
        return index === -1 ? null : nextWeekday(today, index);
      },
    },
  ];

  for (const { re, resolve } of patterns) {
    const match = re.exec(text);
    if (!match) continue;
    const date = resolve(match);
    if (date) return { date, start: match.index, end: match.index + match[0].length };
  }
  return null;
}

/**
 * Turns "Finish portfolio tomorrow #work !high" into a task. Anything it does
 * not recognise stays in the title, so typing normally always works.
 */
export function parseQuickAdd(raw: string, today: string): ParsedQuickAdd {
  let text = raw;
  let priority: TaskPriority = 'medium';
  const tags: string[] = [];

  text = text.replace(/(^|\s)!([a-z]+)\b/gi, (whole, lead: string, token: string) => {
    const match = PRIORITY_TOKENS[token.toLowerCase()];
    if (!match) return whole;
    priority = match;
    return lead;
  });

  text = text.replace(/(^|\s)#([a-z0-9][a-z0-9_-]{0,23})\b/gi, (whole, lead: string, tag: string) => {
    const normalised = tag.toLowerCase();
    if (tags.length >= 8 || tags.includes(normalised)) return lead;
    tags.push(normalised);
    return lead;
  });

  const dateMatch = findDate(text, today);
  if (dateMatch) text = `${text.slice(0, dateMatch.start)} ${text.slice(dateMatch.end)}`;

  const title = text.replace(/\s+/g, ' ').trim();

  return {
    // Never let parsing swallow the whole input.
    title: title || raw.trim(),
    priority,
    dueDate: dateMatch?.date ?? null,
    tags,
  };
}
