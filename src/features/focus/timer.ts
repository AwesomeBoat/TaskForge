export const FOCUS_SECONDS = 25 * 60;

export type TimerPhase = 'idle' | 'running' | 'paused' | 'finished';

export type TimerState = {
  phase: TimerPhase;
  /** Seconds left in the block. */
  remaining: number;
  /** Epoch ms the block ends at, or null when the clock is not running. */
  deadline: number | null;
  startedAt: string | null;
};

export function initialTimer(): TimerState {
  return { phase: 'idle', remaining: FOCUS_SECONDS, deadline: null, startedAt: null };
}

/**
 * Time is tracked as a wall-clock deadline rather than a decrementing counter:
 * browsers throttle timers in background tabs, and a Pomodoro that quietly
 * loses minutes is worse than no Pomodoro.
 */
export function tickTimer(state: TimerState, now: number): TimerState {
  if (state.phase !== 'running' || state.deadline === null) return state;

  const remaining = Math.max(0, Math.round((state.deadline - now) / 1000));
  if (remaining === 0) return { ...state, phase: 'finished', remaining: 0, deadline: null };
  if (remaining === state.remaining) return state;
  return { ...state, remaining };
}

export function startTimer(state: TimerState, now: number, startedAt: string): TimerState {
  const remaining = state.phase === 'finished' ? FOCUS_SECONDS : state.remaining;
  return { phase: 'running', remaining, deadline: now + remaining * 1000, startedAt };
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  if (state.phase !== 'running') return state;
  const synced = tickTimer(state, now);
  if (synced.phase === 'finished') return synced;
  return { ...synced, phase: 'paused', deadline: null };
}

export function resumeTimer(state: TimerState, now: number): TimerState {
  if (state.phase !== 'paused') return state;
  return { ...state, phase: 'running', deadline: now + state.remaining * 1000 };
}

export function resetTimer(): TimerState {
  return initialTimer();
}

export function elapsedSeconds(state: TimerState): number {
  return FOCUS_SECONDS - state.remaining;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
