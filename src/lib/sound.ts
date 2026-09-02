let audioContext: AudioContext | null = null;

/**
 * A two-note chime synthesised on the fly — no audio asset to download, and
 * nothing plays unless the user has switched sound on.
 */
export function playCompletionChime(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    audioContext ??= new AudioContext();
    const context = audioContext;
    if (context.state === 'suspended') void context.resume();

    const now = context.currentTime;
    for (const [index, frequency] of [660, 990].entries()) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.08;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.06, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.24);
    }
  } catch {
    // Audio is a nicety; never let it break a completion.
  }
}
