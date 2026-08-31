import type { StatCounters, StepEngine } from '../../engine/types';
import type { SearchState, SearchStep } from './types';

export const searchEngine: StepEngine<SearchState, SearchStep> = {
  applyStep(state, step) {
    switch (step.kind) {
      case 'probe':
        return { ...state, probed: [...state.probed, step.index] };
      case 'narrow':
        return { ...state, lo: step.lo, hi: step.hi };
      case 'found':
        return { ...state, foundIndex: step.index };
      case 'exhausted':
        return { ...state, exhausted: true };
      case 'note':
        return { ...state, note: step.note };
      default:
        return state;
    }
  },

  invertStep(state, step) {
    switch (step.kind) {
      case 'probe':
        // Only `probe` ever appends, so dropping the last entry is exact.
        return { ...state, probed: state.probed.slice(0, -1) };
      case 'narrow':
        return { ...state, lo: step.prevLo, hi: step.prevHi };
      case 'found':
        return { ...state, foundIndex: null };
      case 'exhausted':
        return { ...state, exhausted: false };
      case 'note':
        return { ...state, note: step.prevNote };
      default:
        return state;
    }
  },

  statsDelta(step): Partial<StatCounters> {
    switch (step.kind) {
      case 'compare':
        return { comparisons: 1, accesses: 1 };
      case 'probe':
        return { accesses: 1 };
      default:
        return {};
    }
  },

  lineFor(step) {
    return step.line;
  },
};

export function initSearchState(values: number[]): SearchState {
  return {
    values: [...values],
    lo: 0,
    hi: values.length - 1,
    probed: [],
    foundIndex: null,
    exhausted: false,
    note: null,
  };
}

/** Emitter shared by the search generators, mirroring SortCtx. */
export class SearchCtx {
  readonly values: number[];
  private currentLo: number;
  private currentHi: number;
  private currentNote: string | null = null;

  constructor(values: readonly number[]) {
    this.values = [...values];
    this.currentLo = 0;
    this.currentHi = values.length - 1;
  }

  at(index: number): number {
    return this.values[index];
  }

  *probe(index: number, line?: number): Generator<SearchStep> {
    yield { kind: 'probe', index, line };
  }

  *compare(index: number, target: number, line?: number): Generator<SearchStep> {
    yield { kind: 'compare', index, target, line };
  }

  *narrow(lo: number, hi: number, line?: number): Generator<SearchStep> {
    const prevLo = this.currentLo;
    const prevHi = this.currentHi;
    this.currentLo = lo;
    this.currentHi = hi;
    yield { kind: 'narrow', lo, hi, prevLo, prevHi, line };
  }

  *found(index: number, line?: number): Generator<SearchStep> {
    yield { kind: 'found', index, line };
  }

  *exhausted(line?: number): Generator<SearchStep> {
    yield { kind: 'exhausted', line };
  }

  *note(note: string | null, line?: number): Generator<SearchStep> {
    const prevNote = this.currentNote;
    this.currentNote = note;
    yield { kind: 'note', note, prevNote, line };
  }
}
