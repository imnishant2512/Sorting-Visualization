import { initSortState } from '../engine';
import type { SortAlgorithm, SortInput, SortState, SortStep } from '../types';

/** Every sorting algorithm shares the same initState; this trims the boilerplate. */
export function defineSort(config: {
  id: string;
  label: string;
  summary: string;
  complexity: { time: string; space: string };
  pseudocode: string[];
  generate(state: SortState, input: SortInput): Generator<SortStep>;
}): SortAlgorithm {
  return {
    id: config.id,
    label: config.label,
    summary: config.summary,
    complexity: config.complexity,
    pseudocode: config.pseudocode,
    initState: (input) => initSortState(input.values),
    generate: config.generate,
  };
}
