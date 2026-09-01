import { useEffect, useRef } from 'react';

/** Never apply more than this many steps in a single frame, so the tab stays responsive. */
const MAX_STEPS_PER_FRAME = 400;

export interface PlaybackTickerArgs {
  playing: boolean;
  /** Milliseconds of playback time each step represents. */
  speedMs: number;
  /** False when there is nothing left to advance through. */
  enabled: boolean;
  /** Called with how many steps this frame is worth (always >= 1). */
  onAdvance: (steps: number) => void;
}

/**
 * Drives playback from requestAnimationFrame with a time accumulator, rather
 * than one step per setInterval tick.
 *
 * Browsers clamp timers to roughly 4ms, so a per-tick model tops out near 250
 * steps a second — a 5,000-step bubble sort would take 20+ seconds at its
 * fastest, and far longer in practice. Accumulating elapsed time and applying
 * however many steps it covers keeps slow speeds exact (one step per
 * `speedMs`) while letting fast speeds run at thousands of steps a second.
 */
export function usePlaybackTicker({ playing, speedMs, enabled, onAdvance }: PlaybackTickerArgs) {
  // Kept in a ref so a new callback identity each render doesn't restart the loop.
  const onAdvanceRef = useRef(onAdvance);
  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  });

  useEffect(() => {
    if (!playing || !enabled) return;

    let raf = 0;
    // Seeded from the first callback rather than performance.now(): rAF
    // timestamps do not always share a time origin with performance.now(),
    // and a mismatched seed makes the first delta negative.
    let last: number | null = null;
    let accumulator = 0;

    const frame = (now: number) => {
      if (last === null) {
        last = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      const delta = now - last;
      last = now;
      // A backgrounded tab can hand back a huge delta; cap it so returning to
      // the tab doesn't jump the run forward by thousands of steps at once.
      accumulator += Math.max(0, Math.min(delta, 250));

      const due = Math.floor(accumulator / Math.max(speedMs, 0.5));
      if (due > 0) {
        accumulator -= due * Math.max(speedMs, 0.5);
        onAdvanceRef.current(Math.min(due, MAX_STEPS_PER_FRAME));
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, enabled, speedMs]);
}

/** Rough wall-clock estimate for a run, used to label the step counter. */
export function estimateDurationMs(remainingSteps: number, speedMs: number): number {
  return remainingSteps * speedMs;
}
