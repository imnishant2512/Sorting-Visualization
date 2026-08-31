import type { SortAlgorithm } from './types';
import { bogoSort, bubbleSort, cocktailSort, combSort, gnomeSort } from './algorithms/bubbleFamily';
import { insertionSort, shellSort } from './algorithms/insertionFamily';
import { cycleSort, selectionSort } from './algorithms/selectionFamily';
import { mergeSort } from './algorithms/merge';
import { quickSort } from './algorithms/quick';
import { heapSort } from './algorithms/heap';
import { introSort, timSort } from './algorithms/hybrids';
import { bucketSort, countingSort, radixSort } from './algorithms/nonComparison';

export interface SortGroup {
  label: string;
  algorithms: SortAlgorithm[];
}

/** Grouped by family — the grouping mirrors how the generators share machinery. */
export const SORT_GROUPS: SortGroup[] = [
  { label: 'Bubble family', algorithms: [bubbleSort, cocktailSort, combSort, gnomeSort] },
  { label: 'Insertion family', algorithms: [insertionSort, shellSort] },
  { label: 'Selection family', algorithms: [selectionSort, cycleSort] },
  { label: 'Divide & conquer', algorithms: [mergeSort, quickSort, heapSort] },
  { label: 'Hybrids', algorithms: [timSort, introSort] },
  { label: 'Non-comparison', algorithms: [countingSort, radixSort, bucketSort] },
  { label: 'For fun', algorithms: [bogoSort] },
];

/**
 * Bogo sort's runtime is unbounded, so the page clamps the array size whenever
 * it is selected. Nothing else has a size ceiling.
 */
export const MAX_SIZE_BY_ID: Record<string, number> = { bogo: 6 };

export const SORT_ALGORITHMS: SortAlgorithm[] = SORT_GROUPS.flatMap((g) => g.algorithms);

export const SORT_BY_ID: Record<string, SortAlgorithm> = Object.fromEntries(
  SORT_ALGORITHMS.map((a) => [a.id, a]),
);
