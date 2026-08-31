import { describe, expect, it } from 'vitest';
import { buildSteps, initFrame, stepBack, stepForward } from '../../engine/player';
import { PATH_ALGORITHMS, PATH_BY_ID } from './algorithms';
import { neighbours, pathEngine } from './engine';
import { PATH_STAT_KEYS, type GridState, type PathInput, type PathStep } from './types';

const ROWS = 10;
const COLS = 14;

function makeInput(overrides: Partial<PathInput> = {}): PathInput {
  const size = ROWS * COLS;
  return {
    rows: ROWS,
    cols: COLS,
    walls: new Array(size).fill(false),
    weights: new Array(size).fill(1),
    start: 0,
    end: size - 1,
    ...overrides,
  };
}

/** Independent Dijkstra used purely as a reference oracle for the tests. */
function referenceCost(input: PathInput): number | null {
  const size = input.rows * input.cols;
  const dist = new Array<number>(size).fill(Infinity);
  const done = new Array<boolean>(size).fill(false);
  dist[input.start] = 0;

  for (;;) {
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < size; i++) {
      if (!done[i] && dist[i] < bestDist) {
        bestDist = dist[i];
        best = i;
      }
    }
    if (best === -1) break;
    done[best] = true;
    for (const next of neighbours(best, input.rows, input.cols)) {
      if (input.walls[next]) continue;
      const candidate = dist[best] + input.weights[next];
      if (candidate < dist[next]) dist[next] = candidate;
    }
  }
  return Number.isFinite(dist[input.end]) ? dist[input.end] : null;
}

function run(algorithmId: string, input: PathInput) {
  const def = PATH_BY_ID[algorithmId];
  const { steps, initialState } = buildSteps(def, input);
  let frame = initFrame<GridState>(initialState, PATH_STAT_KEYS, steps.length);
  while (frame.cursor < steps.length - 1) frame = stepForward(frame, steps, pathEngine);
  return { frame, steps, initialState };
}

/** Verifies the emitted path is a real orthogonal chain from start to end. */
function pathIsContiguous(state: GridState, input: PathInput): boolean {
  const cells = state.path.flatMap((on, index) => (on ? [index] : []));
  if (!cells.includes(input.start) || !cells.includes(input.end)) return false;

  const set = new Set(cells);
  let cursor = input.start;
  const walked = new Set([cursor]);
  while (cursor !== input.end) {
    const next = neighbours(cursor, input.rows, input.cols).find(
      (n) => set.has(n) && !walked.has(n),
    );
    if (next === undefined) return false;
    walked.add(next);
    cursor = next;
  }
  return walked.size === cells.length;
}

describe.each(PATH_ALGORITHMS.map((a) => a.id))('%s', (id) => {
  const algorithm = PATH_BY_ID[id];

  it('finds a contiguous route on an open grid', () => {
    const input = makeInput();
    const { frame } = run(id, input);
    expect(frame.state.found).toBe(true);
    expect(pathIsContiguous(frame.state, input)).toBe(true);
  });

  it('routes around a wall', () => {
    const input = makeInput();
    // Vertical wall with a single gap on the bottom row.
    for (let row = 0; row < ROWS - 1; row++) input.walls[row * COLS + 6] = true;
    const { frame } = run(id, input);
    expect(frame.state.found).toBe(true);
    expect(pathIsContiguous(frame.state, input)).toBe(true);
    expect(frame.state.path.some((on, i) => on && input.walls[i])).toBe(false);
  });

  it('reports no route when the end is walled off', () => {
    const input = makeInput();
    for (let row = 0; row < ROWS; row++) input.walls[row * COLS + 6] = true;
    const { frame } = run(id, input);
    expect(frame.state.found).toBe(false);
    expect(frame.state.path.every((on) => !on)).toBe(true);
  });

  it('never visits a wall', () => {
    const input = makeInput();
    for (let i = 0; i < input.walls.length; i += 7) {
      if (i !== input.start && i !== input.end) input.walls[i] = true;
    }
    const { frame } = run(id, input);
    expect(frame.state.visited.some((on, i) => on && input.walls[i])).toBe(false);
  });

  it('visits each cell at most once', () => {
    // Bellman-Ford deliberately re-sweeps cells; it emits `scan`, not `visit`.
    if (id === 'bellman-ford') return;
    const input = makeInput();
    const { steps } = run(id, input);
    const visits = (steps as PathStep[]).filter((s) => s.kind === 'visit');
    expect(new Set(visits.map((s) => (s as { index: number }).index)).size).toBe(visits.length);
  });

  it('steps back to the exact starting state', () => {
    const input = makeInput();
    const { frame, steps, initialState } = run(id, input);
    let current = frame;
    while (current.cursor >= 0) current = stepBack(current, steps, pathEngine);
    expect(current.state).toEqual(initialState);
    for (const key of PATH_STAT_KEYS) expect(current.stats[key]).toBe(0);
  });

  it('every step inverts exactly', () => {
    const input = makeInput({ start: 3, end: ROWS * COLS - 4 });
    input.weights[20] = 8;
    input.walls[15] = true;
    const { steps, initialState } = buildSteps(PATH_BY_ID[id], input);
    let state: GridState = initialState;
    for (const step of steps as PathStep[]) {
      const before = structuredClone(state);
      const after = pathEngine.applyStep(state, step);
      expect(pathEngine.invertStep(after, step)).toEqual(before);
      state = after;
    }
  });

  it('emits only valid pseudocode line indices', () => {
    const { steps } = run(id, makeInput());
    for (const step of steps) {
      const line = pathEngine.lineFor?.(step);
      if (line !== undefined) expect(line).toBeLessThan(algorithm.pseudocode.length);
    }
  });
});

describe('optimality', () => {
  it('BFS finds a shortest route on an unweighted grid', () => {
    const input = makeInput();
    for (let row = 2; row < ROWS; row++) input.walls[row * COLS + 4] = true;
    const { frame } = run('bfs', input);
    const cells = frame.state.path.filter(Boolean).length;
    // Path cells include the start, so cost = cells - 1 on an unweighted grid.
    expect(cells - 1).toBe(referenceCost(input));
  });

  it.each(['dijkstra', 'astar', 'bellman-ford'])(
    '%s finds a cheapest route through weighted terrain',
    (id) => {
      const input = makeInput();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 3; col < 8; col++) input.weights[row * COLS + col] = 8;
      }
      input.weights[input.start] = 1;
      const { frame } = run(id, input);
      expect(frame.state.pathCost).toBe(referenceCost(input));
    },
  );

  it('A* visits no more cells than Dijkstra on an open grid', () => {
    const input = makeInput();
    const dij = run('dijkstra', input);
    const star = run('astar', input);
    expect(star.frame.stats.visited).toBeLessThanOrEqual(dij.frame.stats.visited);
  });
});
