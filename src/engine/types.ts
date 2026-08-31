/**
 * Generic replay engine types.
 *
 * Nothing in this folder knows anything about sorting, grids, trees or graphs.
 * A domain supplies its own State and Step types plus a StepEngine (a pure
 * apply/invert pair), and gets play / pause / step-forward / step-back /
 * live-speed-change for free.
 */

/** Named counters shown in the stats panel, e.g. comparisons / swaps / accesses. */
export type StatCounters = Record<string, number>;

/**
 * The contract a domain implements so the player can walk its steps in both
 * directions.
 *
 * Load-bearing invariant: every Step must carry enough prior data (prevValue,
 * prevChildId, ...) that invertStep never has to recompute or search for it.
 * `invertStep(applyStep(s, step), step)` must deep-equal `s`.
 */
export interface StepEngine<TState, TStep> {
  /** Pure: returns the state after `step` was applied. */
  applyStep(state: TState, step: TStep): TState;
  /** Pure: given the state *after* `step`, returns the state before it. */
  invertStep(state: TState, step: TStep): TState;
  /** Stat deltas for one forward step; stepBack subtracts the same values. */
  statsDelta(step: TStep): Partial<StatCounters>;
  /** Index into the algorithm's pseudocode to highlight while on this step. */
  lineFor?(step: TStep): number | undefined;
}

/** One runnable algorithm (batch mode) or structure operation (operation mode). */
export interface AlgorithmDefinition<TInput, TState, TStep> {
  id: string;
  label: string;
  /** Short description shown next to the algorithm picker. */
  summary?: string;
  /** Big-O labels rendered in the stats panel. */
  complexity?: { time: string; space: string };
  pseudocode: string[];
  /** Builds the starting state from the user's input. */
  initState(input: TInput): TState;
  /** Pure generator: yields step descriptors, never mutates `state`. */
  generate(state: TState, input: TInput): Generator<TStep>;
}

/** A single point in a replay: the state at `cursor`, plus derived display data. */
export interface Frame<TState> {
  state: TState;
  /** -1 = before the first step; steps.length - 1 = finished. */
  cursor: number;
  stats: StatCounters;
  currentLine?: number;
  isFinished: boolean;
}
