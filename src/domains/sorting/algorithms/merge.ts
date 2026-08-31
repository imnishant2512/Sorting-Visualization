import type { SortCtx } from '../engine';
import { SortCtx as Ctx } from '../engine';
import type { SortStep } from '../types';
import { defineSort } from './define';

const LINES = { split: 1, merge: 4, compare: 5, write: 6 };

/**
 * Merges the sorted runs [lo, mid] and [mid+1, hi] in place via two copies.
 *
 * Compare steps highlight the two source positions. Once values start being
 * written back, the left highlight trails the true source (its slot may already
 * hold merged output) — the counters stay exact, only the transient highlight
 * approximates. Exported for Timsort, which merges runs the same way.
 */
export function* mergeRange(
  ctx: SortCtx,
  lo: number,
  mid: number,
  hi: number,
): Generator<SortStep> {
  yield* ctx.setRange({ lo, hi, role: 'active' }, LINES.merge);

  const left: number[] = [];
  const right: number[] = [];
  for (let i = lo; i <= mid; i++) left.push(ctx.at(i));
  for (let i = mid + 1; i <= hi; i++) right.push(ctx.at(i));

  let i = 0;
  let j = 0;
  let k = lo;

  while (i < left.length && j < right.length) {
    yield* ctx.compare(lo + i, mid + 1 + j, LINES.compare);
    if (left[i] <= right[j]) {
      yield* ctx.set(k++, left[i++], LINES.write);
    } else {
      yield* ctx.set(k++, right[j++], LINES.write);
    }
  }
  while (i < left.length) yield* ctx.set(k++, left[i++], LINES.write);
  while (j < right.length) yield* ctx.set(k++, right[j++], LINES.write);
}

export const mergeSort = defineSort({
  id: 'merge',
  label: 'Merge Sort',
  summary: 'Splits the array in half recursively, then merges the sorted halves back together.',
  complexity: { time: 'O(n log n)', space: 'O(n)' },
  pseudocode: [
    'mergeSort(lo, hi):',
    '  if lo >= hi: return',
    '  mid = (lo + hi) / 2',
    '  mergeSort(lo, mid); mergeSort(mid+1, hi)',
    '  merge(lo, mid, hi):',
    '    compare front of each half',
    '    write the smaller value back',
  ],
  *generate(_state, input) {
    const ctx = new Ctx(input.values);

    function* sort(lo: number, hi: number): Generator<SortStep> {
      if (lo >= hi) return;
      const mid = lo + Math.floor((hi - lo) / 2);
      yield* sort(lo, mid);
      yield* sort(mid + 1, hi);
      yield* mergeRange(ctx, lo, mid, hi);
    }

    yield* sort(0, ctx.length - 1);
    yield* ctx.setRange(null, LINES.write);
    yield* ctx.markAllSorted(LINES.write);
  },
});
