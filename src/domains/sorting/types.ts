import type { AlgorithmDefinition } from '../../engine/types';

export type RangeRole = 'active' | 'pivot' | 'left' | 'right' | 'bucket';

/**
 * State replayed by the sorting player.
 *
 * `values` and `sorted` are the substance; `note` and `range` are persistent
 * display context (current gap, current digit place, active partition). Both
 * carry their previous value on the step that changes them so inversion never
 * has to look backwards through the step list.
 */
export interface SortState {
  values: number[];
  sorted: boolean[];
  note: string | null;
  range: { lo: number; hi: number; role: RangeRole } | null;
}

export type SortStep =
  /** Comparing two indices, or one index against a held scalar (insertion's key). */
  | { kind: 'compare'; indices: number[]; scalar?: number; line?: number }
  | { kind: 'swap'; a: number; b: number; line?: number }
  | { kind: 'set'; index: number; value: number; prevValue: number; line?: number }
  | { kind: 'read'; index: number; line?: number }
  /** Cumulative. Only ever carries indices that were not already marked. */
  | { kind: 'markSorted'; indices: number[]; line?: number }
  | {
      kind: 'rangeHighlight';
      range: { lo: number; hi: number; role: RangeRole } | null;
      prevRange: { lo: number; hi: number; role: RangeRole } | null;
      line?: number;
    }
  | { kind: 'bucketPlace'; index: number; bucket: number; place: number; line?: number }
  | { kind: 'passBoundary'; note: string | null; prevNote: string | null; line?: number };

export interface SortInput {
  values: number[];
}

export type SortAlgorithm = AlgorithmDefinition<SortInput, SortState, SortStep>;

export const SORT_STAT_KEYS = ['comparisons', 'swaps', 'accesses'] as const;

/** Transient per-step highlighting, derived from the step rather than stored in state. */
export type HighlightKind = 'compare' | 'swap' | 'write' | 'read' | 'bucket';

export function highlightsForStep(step: SortStep | null): Map<number, HighlightKind> {
  const map = new Map<number, HighlightKind>();
  if (!step) return map;
  switch (step.kind) {
    case 'compare':
      for (const i of step.indices) map.set(i, 'compare');
      break;
    case 'swap':
      map.set(step.a, 'swap');
      map.set(step.b, 'swap');
      break;
    case 'set':
      map.set(step.index, 'write');
      break;
    case 'read':
      map.set(step.index, 'read');
      break;
    case 'bucketPlace':
      map.set(step.index, 'bucket');
      break;
    default:
      break;
  }
  return map;
}
