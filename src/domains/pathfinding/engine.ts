import type { StatCounters, StepEngine } from '../../engine/types';
import type { GridState, PathInput, PathStep } from './types';

export const pathEngine: StepEngine<GridState, PathStep> = {
  applyStep(state, step) {
    switch (step.kind) {
      case 'visit': {
        const visited = [...state.visited];
        const frontier = [...state.frontier];
        visited[step.index] = true;
        // A cell leaves the frontier exactly when it is visited.
        frontier[step.index] = false;
        return { ...state, visited, frontier };
      }
      case 'scan':
        return { ...state, scanning: step.index };
      case 'frontier': {
        const frontier = [...state.frontier];
        frontier[step.index] = true;
        return { ...state, frontier };
      }
      case 'relax': {
        const dist = [...state.dist];
        dist[step.index] = step.dist;
        return { ...state, dist };
      }
      case 'path': {
        const path = [...state.path];
        path[step.index] = true;
        return { ...state, path };
      }
      case 'found':
        return { ...state, found: true, pathCost: step.cost };
      case 'exhausted':
        return { ...state, found: false };
      default:
        return state;
    }
  },

  invertStep(state, step) {
    switch (step.kind) {
      case 'visit': {
        const visited = [...state.visited];
        const frontier = [...state.frontier];
        visited[step.index] = false;
        // It was on the frontier before being visited (the start cell aside,
        // which the generators also push onto the frontier first).
        frontier[step.index] = true;
        return { ...state, visited, frontier };
      }
      case 'scan':
        return { ...state, scanning: step.prevIndex };
      case 'frontier': {
        const frontier = [...state.frontier];
        frontier[step.index] = false;
        return { ...state, frontier };
      }
      case 'relax': {
        const dist = [...state.dist];
        dist[step.index] = step.prevDist;
        return { ...state, dist };
      }
      case 'path': {
        const path = [...state.path];
        path[step.index] = false;
        return { ...state, path };
      }
      case 'found':
        return { ...state, found: false, pathCost: null };
      case 'exhausted':
        return { ...state, found: false };
      default:
        return state;
    }
  },

  statsDelta(step): Partial<StatCounters> {
    switch (step.kind) {
      case 'visit':
      case 'scan':
        return { visited: 1 };
      case 'frontier':
        return { discovered: 1 };
      case 'relax':
        return { relaxations: 1 };
      case 'path':
        return { pathCells: 1 };
      default:
        return {};
    }
  },

  lineFor(step) {
    return step.line;
  },
};

export function initGridState(input: PathInput): GridState {
  const size = input.rows * input.cols;
  return {
    rows: input.rows,
    cols: input.cols,
    walls: [...input.walls],
    weights: [...input.weights],
    start: input.start,
    end: input.end,
    visited: new Array(size).fill(false),
    frontier: new Array(size).fill(false),
    dist: new Array(size).fill(Infinity),
    path: new Array(size).fill(false),
    scanning: null,
    found: false,
    pathCost: null,
  };
}

/** Orthogonal neighbours, in a fixed order so runs are deterministic. */
export function neighbours(index: number, rows: number, cols: number): number[] {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const result: number[] = [];
  if (row > 0) result.push(index - cols);
  if (col < cols - 1) result.push(index + 1);
  if (row < rows - 1) result.push(index + cols);
  if (col > 0) result.push(index - 1);
  return result;
}

export function manhattan(a: number, b: number, cols: number): number {
  const ar = Math.floor(a / cols);
  const ac = a % cols;
  const br = Math.floor(b / cols);
  const bc = b % cols;
  return Math.abs(ar - br) + Math.abs(ac - bc);
}
