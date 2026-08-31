import type { SortCtx } from '../engine';
import { SortCtx as Ctx } from '../engine';
import type { SortStep } from '../types';
import { defineSort } from './define';

const LINES = { partition: 3, compare: 4, swap: 5, place: 6, recurse: 7 };

/** Lomuto partition around a[hi]; returns the pivot's final index. */
export function* partitionLomuto(
  ctx: SortCtx,
  lo: number,
  hi: number,
): Generator<SortStep, number> {
  yield* ctx.setRange({ lo, hi, role: 'pivot' }, LINES.partition);
  let i = lo - 1;
  for (let j = lo; j < hi; j++) {
    yield* ctx.compare(j, hi, LINES.compare);
    if (ctx.at(j) < ctx.at(hi)) {
      i++;
      if (i !== j) yield* ctx.swap(i, j, LINES.swap);
    }
  }
  i++;
  if (i !== hi) yield* ctx.swap(i, hi, LINES.place);
  yield* ctx.markSorted([i], LINES.place);
  return i;
}

export const quickSort = defineSort({
  id: 'quick',
  label: 'Quick Sort',
  summary: 'Partitions around a pivot so smaller values move left, then recurses into both sides.',
  complexity: { time: 'O(n log n) average, O(n²) worst', space: 'O(log n)' },
  pseudocode: [
    'quickSort(lo, hi):',
    '  if lo >= hi: return',
    '  pivot = a[hi]',
    '  partition: i = lo - 1',
    '    for j = lo to hi-1: if a[j] < pivot',
    '      i = i + 1; swap a[i], a[j]',
    '  swap a[i+1], a[hi]  // pivot lands here',
    '  quickSort(lo, i); quickSort(i+2, hi)',
  ],
  *generate(_state, input) {
    const ctx = new Ctx(input.values);

    function* sort(lo: number, hi: number): Generator<SortStep> {
      // Only a single-element range is trivially sorted; an empty range
      // (lo > hi) must mark nothing at all.
      if (lo > hi) return;
      if (lo === hi) {
        yield* ctx.markSorted([lo], LINES.recurse);
        return;
      }
      const p = yield* partitionLomuto(ctx, lo, hi);
      yield* sort(lo, p - 1);
      yield* sort(p + 1, hi);
    }

    yield* sort(0, ctx.length - 1);
    yield* ctx.setRange(null, LINES.recurse);
    yield* ctx.markAllSorted(LINES.recurse);
  },
});
