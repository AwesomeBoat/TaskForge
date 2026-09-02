import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isIsoDate } from '../src/lib/dates';
import { levelProgress } from '../src/lib/xp';

describe('date helpers', () => {
  it('validates and shifts ISO calendar dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(addDays('2026-09-02', 7)).toBe('2026-09-09');
    expect(daysBetween('2026-09-02', '2026-09-05')).toBe(3);
  });
});

describe('levelProgress', () => {
  it('advances through the level curve', () => {
    expect(levelProgress(100)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNextLevel: 200 });
    expect(levelProgress(250)).toMatchObject({ level: 2, xpIntoLevel: 150, xpForNextLevel: 200 });
  });
});
