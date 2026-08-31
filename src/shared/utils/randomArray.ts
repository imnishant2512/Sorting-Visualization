export const ARRAY_SIZE = { min: 5, max: 150, default: 45 } as const;
export const VALUE_RANGE = { min: 5, max: 400 } as const;
export const SPEED_MS = { min: 1, max: 300, default: 60 } as const;

export function randomArray(
  size: number,
  min: number = VALUE_RANGE.min,
  max: number = VALUE_RANGE.max,
): number[] {
  return Array.from({ length: size }, () => min + Math.floor(Math.random() * (max - min + 1)));
}

export type ArrayShape = 'random' | 'nearly-sorted' | 'reversed' | 'few-unique';

export const ARRAY_SHAPES: Array<{ id: ArrayShape; label: string }> = [
  { id: 'random', label: 'Random' },
  { id: 'nearly-sorted', label: 'Nearly sorted' },
  { id: 'reversed', label: 'Reversed' },
  { id: 'few-unique', label: 'Few unique' },
];

/**
 * Input shape matters as much as array size for showing how algorithms differ —
 * insertion sort is near-linear on nearly-sorted data, quicksort degrades on
 * reversed data with a last-element pivot.
 */
export function makeArray(shape: ArrayShape, size: number): number[] {
  switch (shape) {
    case 'nearly-sorted': {
      const values = randomArray(size).sort((a, b) => a - b);
      const swaps = Math.max(1, Math.floor(size / 12));
      for (let i = 0; i < swaps; i++) {
        const a = Math.floor(Math.random() * size);
        const b = Math.floor(Math.random() * size);
        [values[a], values[b]] = [values[b], values[a]];
      }
      return values;
    }
    case 'reversed':
      return randomArray(size).sort((a, b) => b - a);
    case 'few-unique': {
      const pool = randomArray(Math.max(2, Math.ceil(size / 12)));
      return Array.from({ length: size }, () => pool[Math.floor(Math.random() * pool.length)]);
    }
    case 'random':
    default:
      return randomArray(size);
  }
}

/** Ascending array with distinct-ish values — the input the ordered searches need. */
export function randomSortedArray(size: number): number[] {
  const values: number[] = [];
  let current = VALUE_RANGE.min;
  for (let i = 0; i < size; i++) {
    current += 1 + Math.floor(Math.random() * 12);
    values.push(current);
  }
  return values;
}
