import { describe, expect, it } from 'vitest';
import {
  elapsedSeconds,
  FOCUS_SECONDS,
  formatClock,
  initialTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startTimer,
  tickTimer,
} from '../src/features/focus/timer';

const T0 = 1_700_000_000_000;

describe('focus timer', () => {
  it('starts a full block', () => {
    const state = startTimer(initialTimer(), T0, new Date(T0).toISOString());

    expect(state.phase).toBe('running');
    expect(state.remaining).toBe(FOCUS_SECONDS);
    expect(state.deadline).toBe(T0 + FOCUS_SECONDS * 1000);
  });

  it('counts down from the wall clock, not from tick counts', () => {
    const started = startTimer(initialTimer(), T0, new Date(T0).toISOString());

    // A tab that was throttled for five minutes still lands on the right time.
    const later = tickTimer(started, T0 + 5 * 60 * 1000);

    expect(later.remaining).toBe(FOCUS_SECONDS - 300);
    expect(elapsedSeconds(later)).toBe(300);
  });

  it('pauses without losing the remaining time, and resumes from there', () => {
    const started = startTimer(initialTimer(), T0, new Date(T0).toISOString());
    const paused = pauseTimer(started, T0 + 60_000);

    expect(paused.phase).toBe('paused');
    expect(paused.remaining).toBe(FOCUS_SECONDS - 60);
    expect(paused.deadline).toBeNull();

    // Time passing while paused must not consume the block.
    expect(tickTimer(paused, T0 + 10 * 60_000)).toEqual(paused);

    const resumed = resumeTimer(paused, T0 + 10 * 60_000);
    expect(resumed.phase).toBe('running');
    expect(resumed.remaining).toBe(FOCUS_SECONDS - 60);
    expect(resumed.deadline).toBe(T0 + 10 * 60_000 + (FOCUS_SECONDS - 60) * 1000);
  });

  it('finishes when the block runs out', () => {
    const started = startTimer(initialTimer(), T0, new Date(T0).toISOString());
    const finished = tickTimer(started, T0 + FOCUS_SECONDS * 1000);

    expect(finished.phase).toBe('finished');
    expect(finished.remaining).toBe(0);
    expect(finished.startedAt).toBe(started.startedAt);
  });

  it('resets back to a fresh block', () => {
    const started = startTimer(initialTimer(), T0, new Date(T0).toISOString());
    const partway = tickTimer(started, T0 + 90_000);

    expect(resetTimer()).toEqual(initialTimer());
    expect(elapsedSeconds(partway)).toBe(90);
  });

  it('starts a new full block after one finished', () => {
    const finished = tickTimer(
      startTimer(initialTimer(), T0, new Date(T0).toISOString()),
      T0 + FOCUS_SECONDS * 1000,
    );
    const next = startTimer(finished, T0 + FOCUS_SECONDS * 1000, new Date().toISOString());

    expect(next.remaining).toBe(FOCUS_SECONDS);
    expect(next.phase).toBe('running');
  });

  it('ignores transitions that do not apply', () => {
    const idle = initialTimer();
    expect(pauseTimer(idle, T0)).toEqual(idle);
    expect(resumeTimer(idle, T0)).toEqual(idle);
    expect(tickTimer(idle, T0 + 60_000)).toEqual(idle);
  });

  it('formats the clock', () => {
    expect(formatClock(FOCUS_SECONDS)).toBe('25:00');
    expect(formatClock(61)).toBe('01:01');
    expect(formatClock(0)).toBe('00:00');
  });
});
