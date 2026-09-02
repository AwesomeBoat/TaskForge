import type { TaskPriority } from '@/types';

/** XP granted the first time a task is completed. */
export const XP_BY_PRIORITY: Record<TaskPriority, number> = {
  low: 10,
  medium: 20,
  high: 40,
};

export type LevelProgress = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  totalXp: number;
};

/**
 * Levelling curve: advancing from level L costs `L * 100` XP, so early levels
 * come quickly and later ones stay meaningful without becoming a grind.
 */
export function levelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = xp;
  while (remaining >= level * 100) {
    remaining -= level * 100;
    level += 1;
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: level * 100, totalXp: xp };
}
