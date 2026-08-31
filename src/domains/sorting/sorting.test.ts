import { describe, expect, it } from 'vitest';
import { buildSteps, initFrame, stepBack, stepForward } from '../../engine/player';
import { sortEngine } from './engine';
import { SORT_ALGORITHMS, SORT_BY_ID } from './registry';
import { SORT_STAT_KEYS, type SortState, type SortStep } from './types';

const CASES: Record<string, number[]> = {
  empty: [],
  single: [7],
  pair: [2, 1],
  random: [42, 7, 19, 250, 3, 88, 15, 61, 99, 4, 130, 27],
  sorted: [1, 2, 3, 4, 5, 6, 7, 8],
  reversed: [9, 8, 7, 6, 5, 4, 3, 2, 1],
  duplicates: [5, 3, 5, 1, 3, 5, 1, 1, 9, 3],
  allSame: [4, 4, 4, 4, 4],
  wideRange: [1, 1000, 50, 7, 999, 12, 345],
};

/** Runs every step and returns the final frame. */
function runToEnd(algorithmId: string, values: number[]) {
  const def = SORT_BY_ID[algorithmId];
  const { steps, initialState } = buildSteps(def, { values });
  let frame = initFrame<SortState>(initialState, SORT_STAT_KEYS, steps.length);
  while (frame.cursor < steps.length - 1) {
    frame = stepForward(frame, steps, sortEngine);
  }
  return { frame, steps, initialState };
}

// Bogo sort cannot be run on the shared cases — it is exercised separately below.
const DETERMINISTIC = SORT_ALGORITHMS.filter((a) => a.id !== 'bogo');

describe.each(DETERMINISTIC.map((a) => a.id))('%s', (id) => {
  it.each(Object.keys(CASES))('sorts the %s case', (caseName) => {
    const values = CASES[caseName];
    const { frame } = runToEnd(id, values);
    expect(frame.state.values).toEqual([...values].sort((a, b) => a - b));
  });

  it('marks every element sorted when finished', () => {
    const { frame } = runToEnd(id, CASES.random);
    expect(frame.state.sorted.every(Boolean)).toBe(true);
  });

  it('returns to the exact starting state when stepped all the way back', () => {
    const { frame, steps, initialState } = runToEnd(id, CASES.random);
    let current = frame;
    while (current.cursor >= 0) {
      current = stepBack(current, steps, sortEngine);
    }
    expect(current.state).toEqual(initialState);
    for (const key of SORT_STAT_KEYS) {
      expect(current.stats[key]).toBe(0);
    }
  });

  it('every step inverts exactly (apply then invert is identity)', () => {
    const def = SORT_BY_ID[id];
    const { steps, initialState } = buildSteps(def, { values: CASES.duplicates });
    let state: SortState = initialState;
    for (const step of steps as SortStep[]) {
      const before = structuredClone(state);
      const after = sortEngine.applyStep(state, step);
      expect(sortEngine.invertStep(after, step)).toEqual(before);
      state = after;
    }
  });
});

describe('stats', () => {
  it('bubble sort on [3,1,2] does exactly 3 comparisons and 2 swaps', () => {
    const { frame } = runToEnd('bubble', [3, 1, 2]);
    expect(frame.stats.comparisons).toBe(3);
    expect(frame.stats.swaps).toBe(2);
  });

  it('non-comparison sorts perform zero comparisons', () => {
    for (const id of ['counting', 'radix']) {
      const { frame } = runToEnd(id, CASES.random);
      expect(frame.stats.comparisons).toBe(0);
    }
  });

  it('bucket sort compares only inside its buckets', () => {
    const { frame } = runToEnd('bucket', CASES.random);
    expect(frame.stats.comparisons).toBeGreaterThan(0);
    expect(frame.stats.swaps).toBe(0);
  });

  it('counts accesses monotonically forward and unwinds them backward', () => {
    const { frame, steps } = runToEnd('quick', CASES.reversed);
    expect(frame.stats.accesses).toBeGreaterThan(0);
    let current = frame;
    for (let i = 0; i < 5; i++) current = stepBack(current, steps, sortEngine);
    for (let i = 0; i < 5; i++) current = stepForward(current, steps, sortEngine);
    expect(current.stats).toEqual(frame.stats);
    expect(current.state).toEqual(frame.state);
  });
});

describe('bogo sort', () => {
  it('eventually sorts a tiny array', () => {
    const { frame } = runToEnd('bogo', [4, 1, 3, 2]);
    expect(frame.state.values).toEqual([1, 2, 3, 4]);
  });

  it('handles an already-sorted array without shuffling', () => {
    const { frame, steps } = runToEnd('bogo', [1, 2, 3]);
    expect(frame.state.values).toEqual([1, 2, 3]);
    expect(steps.filter((s) => s.kind === 'swap')).toHaveLength(0);
  });

  it('inverts every step exactly', () => {
    const { steps, initialState } = buildSteps(SORT_BY_ID.bogo, { values: [3, 1, 2] });
    let state: SortState = initialState;
    for (const step of steps as SortStep[]) {
      const before = structuredClone(state);
      const after = sortEngine.applyStep(state, step);
      expect(sortEngine.invertStep(after, step)).toEqual(before);
      state = after;
    }
  });
});

describe('pseudocode mapping', () => {
  it('every emitted line index is within the algorithm’s pseudocode', () => {
    for (const def of SORT_ALGORITHMS) {
      // Bogo on a 12-element array would not terminate in any useful time.
      const values = def.id === 'bogo' ? [3, 1, 2] : CASES.random;
      const { steps } = buildSteps(def, { values });
      for (const step of steps) {
        const line = sortEngine.lineFor?.(step);
        if (line === undefined) continue;
        expect(
          line,
          `${def.id} emitted line ${line} but has ${def.pseudocode.length} lines`,
        ).toBeLessThan(def.pseudocode.length);
      }
    }
  });
});
