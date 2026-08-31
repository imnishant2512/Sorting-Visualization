import type { StatCounters, StepEngine } from '../../engine/types';
import type { RangeRole, SortState, SortStep } from './types';

/** Pure apply/invert pair for sorting steps. Every mutation is exactly reversible. */
export const sortEngine: StepEngine<SortState, SortStep> = {
  applyStep(state, step) {
    switch (step.kind) {
      case 'swap': {
        const values = [...state.values];
        const tmp = values[step.a];
        values[step.a] = values[step.b];
        values[step.b] = tmp;
        return { ...state, values };
      }
      case 'set': {
        const values = [...state.values];
        values[step.index] = step.value;
        return { ...state, values };
      }
      case 'markSorted': {
        const sorted = [...state.sorted];
        for (const i of step.indices) sorted[i] = true;
        return { ...state, sorted };
      }
      case 'rangeHighlight':
        return { ...state, range: step.range };
      case 'passBoundary':
        return { ...state, note: step.note };
      default:
        // compare / read / bucketPlace are observations, not mutations.
        return state;
    }
  },

  invertStep(state, step) {
    switch (step.kind) {
      case 'swap': {
        const values = [...state.values];
        const tmp = values[step.a];
        values[step.a] = values[step.b];
        values[step.b] = tmp;
        return { ...state, values };
      }
      case 'set': {
        const values = [...state.values];
        values[step.index] = step.prevValue;
        return { ...state, values };
      }
      case 'markSorted': {
        const sorted = [...state.sorted];
        for (const i of step.indices) sorted[i] = false;
        return { ...state, sorted };
      }
      case 'rangeHighlight':
        return { ...state, range: step.prevRange };
      case 'passBoundary':
        return { ...state, note: step.prevNote };
      default:
        return state;
    }
  },

  statsDelta(step): Partial<StatCounters> {
    switch (step.kind) {
      case 'compare':
        return { comparisons: 1, accesses: step.scalar === undefined ? step.indices.length : 1 };
      case 'swap':
        return { swaps: 1, accesses: 4 };
      case 'set':
      case 'read':
      case 'bucketPlace':
        return { accesses: 1 };
      default:
        return {};
    }
  },

  lineFor(step) {
    return step.line;
  },
};

export function initSortState(values: number[]): SortState {
  return {
    values: [...values],
    sorted: values.map(() => false),
    note: null,
    range: null,
  };
}

/**
 * Bookkeeping shared by every sorting generator.
 *
 * Generators drive this instead of touching arrays directly, so the working
 * copy the algorithm reads always matches what the engine's applyStep produces,
 * and `markSorted` can never double-mark an index (which would break inversion).
 */
export class SortCtx {
  readonly values: number[];
  private readonly sortedFlags: boolean[];
  private currentNote: string | null = null;
  private currentRange: { lo: number; hi: number; role: RangeRole } | null = null;

  constructor(values: readonly number[]) {
    this.values = [...values];
    this.sortedFlags = values.map(() => false);
  }

  get length(): number {
    return this.values.length;
  }

  /** Untracked peek — use inside conditions after emitting the matching compare/read. */
  at(index: number): number {
    return this.values[index];
  }

  *compare(i: number, j: number, line?: number): Generator<SortStep> {
    yield { kind: 'compare', indices: [i, j], line };
  }

  *compareScalar(i: number, scalar: number, line?: number): Generator<SortStep> {
    yield { kind: 'compare', indices: [i], scalar, line };
  }

  *swap(a: number, b: number, line?: number): Generator<SortStep> {
    const tmp = this.values[a];
    this.values[a] = this.values[b];
    this.values[b] = tmp;
    yield { kind: 'swap', a, b, line };
  }

  *set(index: number, value: number, line?: number): Generator<SortStep> {
    const prevValue = this.values[index];
    this.values[index] = value;
    yield { kind: 'set', index, value, prevValue, line };
  }

  *read(index: number, line?: number): Generator<SortStep> {
    yield { kind: 'read', index, line };
  }

  *markSorted(indices: number[], line?: number): Generator<SortStep> {
    const fresh = indices.filter(
      (i) => i >= 0 && i < this.sortedFlags.length && !this.sortedFlags[i],
    );
    if (fresh.length === 0) return;
    for (const i of fresh) this.sortedFlags[i] = true;
    yield { kind: 'markSorted', indices: fresh, line };
  }

  *markAllSorted(line?: number): Generator<SortStep> {
    yield* this.markSorted(
      this.values.map((_, i) => i),
      line,
    );
  }

  *setRange(
    range: { lo: number; hi: number; role: RangeRole } | null,
    line?: number,
  ): Generator<SortStep> {
    const prevRange = this.currentRange;
    this.currentRange = range;
    yield { kind: 'rangeHighlight', range, prevRange, line };
  }

  *bucketPlace(index: number, bucket: number, place: number, line?: number): Generator<SortStep> {
    yield { kind: 'bucketPlace', index, bucket, place, line };
  }

  *note(note: string | null, line?: number): Generator<SortStep> {
    const prevNote = this.currentNote;
    this.currentNote = note;
    yield { kind: 'passBoundary', note, prevNote, line };
  }
}
