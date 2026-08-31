import type { AlgorithmDefinition } from '../../engine/types';

/**
 * Searching reuses the bar view from sorting, but the interesting state is the
 * *window* of candidates that survives, not the values themselves — nothing is
 * ever written, so `values` is constant for the whole replay.
 */
export interface SearchState {
  values: number[];
  /** Active candidate window, inclusive. */
  lo: number;
  hi: number;
  /** Indices inspected so far, in order. */
  probed: number[];
  foundIndex: number | null;
  /** Set once the search has definitively finished without a match. */
  exhausted: boolean;
  note: string | null;
}

export type SearchStep =
  | { kind: 'probe'; index: number; line?: number }
  | { kind: 'compare'; index: number; target: number; line?: number }
  | { kind: 'narrow'; lo: number; hi: number; prevLo: number; prevHi: number; line?: number }
  | { kind: 'found'; index: number; line?: number }
  | { kind: 'exhausted'; line?: number }
  | { kind: 'note'; note: string | null; prevNote: string | null; line?: number };

export interface SearchInput {
  /** Must be ascending for every algorithm except linear search. */
  values: number[];
  target: number;
}

export type SearchAlgorithm = AlgorithmDefinition<SearchInput, SearchState, SearchStep>;

export const SEARCH_STAT_KEYS = ['comparisons', 'accesses'] as const;
