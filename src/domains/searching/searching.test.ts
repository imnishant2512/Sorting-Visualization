import { describe, expect, it } from 'vitest';
import { buildSteps, initFrame, stepBack, stepForward } from '../../engine/player';
import { SEARCH_ALGORITHMS } from './algorithms';
import { searchEngine } from './engine';
import { SEARCH_STAT_KEYS, type SearchState, type SearchStep } from './types';

const SORTED = [3, 8, 12, 19, 27, 34, 41, 55, 68, 72, 90, 104, 150, 199, 240];

function run(algorithm: (typeof SEARCH_ALGORITHMS)[number], values: number[], target: number) {
  const { steps, initialState } = buildSteps(algorithm, { values, target });
  let frame = initFrame<SearchState>(initialState, SEARCH_STAT_KEYS, steps.length);
  while (frame.cursor < steps.length - 1) {
    frame = stepForward(frame, steps, searchEngine);
  }
  return { frame, steps, initialState };
}

describe.each(SEARCH_ALGORITHMS.map((a) => a.id))('%s', (id) => {
  const algorithm = SEARCH_ALGORITHMS.find((a) => a.id === id)!;

  it('finds every value present in the array', () => {
    for (let i = 0; i < SORTED.length; i++) {
      const { frame } = run(algorithm, SORTED, SORTED[i]);
      expect(frame.state.foundIndex, `target ${SORTED[i]}`).toBe(i);
    }
  });

  it('reports exhausted for values that are absent', () => {
    for (const target of [1, 20, 100, 300]) {
      const { frame } = run(algorithm, SORTED, target);
      expect(frame.state.foundIndex, `target ${target}`).toBeNull();
      expect(frame.state.exhausted).toBe(true);
    }
  });

  it('handles an empty array', () => {
    const { frame } = run(algorithm, [], 5);
    expect(frame.state.foundIndex).toBeNull();
  });

  it('never writes to the array', () => {
    const { frame, initialState } = run(algorithm, SORTED, 55);
    expect(frame.state.values).toEqual(initialState.values);
  });

  it('steps back to the exact starting state', () => {
    const { frame, steps, initialState } = run(algorithm, SORTED, 104);
    let current = frame;
    while (current.cursor >= 0) current = stepBack(current, steps, searchEngine);
    expect(current.state).toEqual(initialState);
    for (const key of SEARCH_STAT_KEYS) expect(current.stats[key]).toBe(0);
  });

  it('every step inverts exactly', () => {
    const { steps, initialState } = buildSteps(algorithm, { values: SORTED, target: 41 });
    let state: SearchState = initialState;
    for (const step of steps as SearchStep[]) {
      const before = structuredClone(state);
      const after = searchEngine.applyStep(state, step);
      expect(searchEngine.invertStep(after, step)).toEqual(before);
      state = after;
    }
  });

  it('emits only valid pseudocode line indices', () => {
    const { steps } = buildSteps(algorithm, { values: SORTED, target: 41 });
    for (const step of steps) {
      const line = searchEngine.lineFor?.(step);
      if (line !== undefined) expect(line).toBeLessThan(algorithm.pseudocode.length);
    }
  });
});

describe('linear search', () => {
  it('works on unsorted input, unlike the others', () => {
    const unsorted = [9, 2, 7, 4, 1];
    const { frame } = run(SEARCH_ALGORITHMS[0], unsorted, 7);
    expect(frame.state.foundIndex).toBe(2);
  });
});

describe('binary search efficiency', () => {
  it('uses far fewer comparisons than linear search on the same input', () => {
    const linear = run(SEARCH_ALGORITHMS[0], SORTED, 240);
    const binary = run(SEARCH_ALGORITHMS[1], SORTED, 240);
    expect(binary.frame.stats.comparisons).toBeLessThan(linear.frame.stats.comparisons);
  });
});
