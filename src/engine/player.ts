import type { AlgorithmDefinition, Frame, StatCounters, StepEngine } from './types';

/**
 * Drains an algorithm's generator eagerly into a fixed step list.
 *
 * Everything downstream is cursor arithmetic over this array, which is what
 * makes pause / step-back / speed-change trivial: the algorithm code runs once,
 * up front, and is never touched again during playback.
 */
export function buildSteps<TInput, TState, TStep>(
  def: AlgorithmDefinition<TInput, TState, TStep>,
  input: TInput,
): { steps: TStep[]; initialState: TState } {
  const initialState = def.initState(input);
  const steps: TStep[] = [];
  for (const step of def.generate(initialState, input)) {
    steps.push(step);
  }
  return { steps, initialState };
}

export function initFrame<TState>(
  initialState: TState,
  statKeys: readonly string[] = [],
  totalSteps = 0,
): Frame<TState> {
  const stats: StatCounters = {};
  for (const key of statKeys) stats[key] = 0;
  return {
    state: initialState,
    cursor: -1,
    stats,
    currentLine: undefined,
    isFinished: totalSteps === 0,
  };
}

function addStats(stats: StatCounters, delta: Partial<StatCounters>, sign: 1 | -1): StatCounters {
  const next: StatCounters = { ...stats };
  for (const [key, value] of Object.entries(delta)) {
    next[key] = (next[key] ?? 0) + sign * (value ?? 0);
  }
  return next;
}

/** Applies steps[cursor + 1]. No-op when already at the end. */
export function stepForward<TState, TStep>(
  frame: Frame<TState>,
  steps: readonly TStep[],
  engine: StepEngine<TState, TStep>,
): Frame<TState> {
  const next = frame.cursor + 1;
  if (next >= steps.length) return frame.isFinished ? frame : { ...frame, isFinished: true };

  const step = steps[next];
  return {
    state: engine.applyStep(frame.state, step),
    cursor: next,
    stats: addStats(frame.stats, engine.statsDelta(step), 1),
    currentLine: engine.lineFor?.(step),
    isFinished: next === steps.length - 1,
  };
}

/**
 * Applies up to `count` steps in one go, stopping at the end.
 *
 * Playback uses this to apply several steps per animation frame at high
 * speeds: one step per timer tick caps out around 250 steps/second, which
 * makes a 5,000-step run unwatchably long.
 */
export function stepForwardBy<TState, TStep>(
  frame: Frame<TState>,
  steps: readonly TStep[],
  engine: StepEngine<TState, TStep>,
  count: number,
): Frame<TState> {
  let current = frame;
  for (let i = 0; i < count && current.cursor < steps.length - 1; i++) {
    current = stepForward(current, steps, engine);
  }
  return current;
}

/** Un-applies steps[cursor]. No-op when already before the first step. */
export function stepBack<TState, TStep>(
  frame: Frame<TState>,
  steps: readonly TStep[],
  engine: StepEngine<TState, TStep>,
): Frame<TState> {
  if (frame.cursor < 0) return frame;

  const step = steps[frame.cursor];
  const prevCursor = frame.cursor - 1;
  return {
    state: engine.invertStep(frame.state, step),
    cursor: prevCursor,
    stats: addStats(frame.stats, engine.statsDelta(step), -1),
    currentLine: prevCursor >= 0 ? engine.lineFor?.(steps[prevCursor]) : undefined,
    isFinished: false,
  };
}

/** Replays from the start up to (and including) `targetCursor`. Used for scrubbing. */
export function seek<TState, TStep>(
  initialState: TState,
  steps: readonly TStep[],
  engine: StepEngine<TState, TStep>,
  targetCursor: number,
  statKeys: readonly string[] = [],
): Frame<TState> {
  let frame = initFrame(initialState, statKeys, steps.length);
  const target = Math.min(targetCursor, steps.length - 1);
  while (frame.cursor < target) {
    frame = stepForward(frame, steps, engine);
  }
  return frame;
}
