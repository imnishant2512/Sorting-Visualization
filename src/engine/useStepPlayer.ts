import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildSteps, initFrame, seek, stepBack, stepForward } from './player';
import type { AlgorithmDefinition, Frame, StepEngine } from './types';

export interface UseStepPlayerArgs<TInput, TState, TStep> {
  def: AlgorithmDefinition<TInput, TState, TStep>;
  input: TInput;
  /** Must be a stable reference (module-level const per domain). */
  engine: StepEngine<TState, TStep>;
  statKeys: readonly string[];
  /** Delay between ticks in ms; changing it takes effect immediately mid-run. */
  speedMs: number;
  /**
   * Playback is controlled by the caller, not the hook, so one Play button can
   * drive several players at once (race mode).
   */
  playing: boolean;
  /** Fired while `playing` once this player has no steps left. */
  onFinished?: () => void;
}

export interface StepPlayer<TState, TStep> {
  frame: Frame<TState>;
  steps: readonly TStep[];
  /** The step the cursor currently sits on — the one being displayed. */
  currentStep: TStep | null;
  totalSteps: number;
  canStepForward: boolean;
  canStepBack: boolean;
  next(): void;
  prev(): void;
  reset(): void;
  seekTo(cursor: number): void;
}

/**
 * Batch-mode player: builds the full step list once per (def, input) and walks
 * a cursor through it. Pause is just not ticking, step-back is one invertStep,
 * and a speed change re-arms the interval without disturbing the cursor.
 */
export function useStepPlayer<TInput, TState, TStep>({
  def,
  input,
  engine,
  statKeys,
  speedMs,
  playing,
  onFinished,
}: UseStepPlayerArgs<TInput, TState, TStep>): StepPlayer<TState, TStep> {
  const { steps, initialState } = useMemo(() => buildSteps(def, input), [def, input]);

  const [frame, setFrame] = useState<Frame<TState>>(() =>
    initFrame(initialState, statKeys, steps.length),
  );

  // New algorithm or new input: rewind to a fresh frame.
  useEffect(() => {
    setFrame(initFrame(initialState, statKeys, steps.length));
    // statKeys is a module-level constant per domain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, initialState]);

  const atEnd = frame.cursor >= steps.length - 1;

  useEffect(() => {
    if (!playing || atEnd) return;
    const id = window.setInterval(() => {
      setFrame((current) => stepForward(current, steps, engine));
    }, speedMs);
    return () => window.clearInterval(id);
  }, [playing, atEnd, speedMs, steps, engine]);

  // Report completion so the owner can flip its own play state off.
  useEffect(() => {
    if (playing && atEnd) onFinished?.();
  }, [playing, atEnd, onFinished]);

  const next = useCallback(() => {
    setFrame((current) => stepForward(current, steps, engine));
  }, [steps, engine]);

  const prev = useCallback(() => {
    setFrame((current) => stepBack(current, steps, engine));
  }, [steps, engine]);

  const reset = useCallback(() => {
    setFrame(initFrame(initialState, statKeys, steps.length));
  }, [initialState, statKeys, steps.length]);

  const seekTo = useCallback(
    (cursor: number) => {
      setFrame(
        cursor < 0
          ? initFrame(initialState, statKeys, steps.length)
          : seek(initialState, steps, engine, cursor, statKeys),
      );
    },
    [initialState, steps, engine, statKeys],
  );

  return {
    frame,
    steps,
    currentStep: frame.cursor >= 0 ? steps[frame.cursor] : null,
    totalSteps: steps.length,
    canStepForward: !atEnd,
    canStepBack: frame.cursor >= 0,
    next,
    prev,
    reset,
    seekTo,
  };
}
