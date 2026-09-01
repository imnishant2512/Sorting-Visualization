import { mulberry32 } from './random';

export const ARRAY_SIZE = { min: 5, max: 150, default: 45 } as const;
export const VALUE_RANGE = { min: 5, max: 400 } as const;
export const SPEED_MS = { min: 1, max: 300, default: 60 } as const;

/**
 * Every generator here takes a seed so the same link always reproduces the
 * same input — the array itself never has to travel in the URL.
 */
export function randomArray(
  size: number,
  seed: number,
  min: number = VALUE_RANGE.min,
  max: number = VALUE_RANGE.max,
): number[] {
  const next = mulberry32(seed);
  return Array.from({ length: size }, () => min + Math.floor(next() * (max - min + 1)));
}

export type ArrayShape = 'random' | 'nearly-sorted' | 'reversed' | 'few-unique';

export const ARRAY_SHAPES: Array<{ id: ArrayShape; label: string }> = [
  { id: 'random', label: 'Random' },
  { id: 'nearly-sorted', label: 'Nearly sorted' },
  { id: 'reversed', label: 'Reversed' },
  { id: 'few-unique', label: 'Few unique' },
];

export function isArrayShape(value: string | null): value is ArrayShape {
  return ARRAY_SHAPES.some((shape) => shape.id === value);
}

/**
 * Input shape matters as much as array size for showing how algorithms differ —
 * insertion sort is near-linear on nearly-sorted data, quicksort degrades on
 * reversed data with a last-element pivot.
 */
export function makeArray(shape: ArrayShape, size: number, seed: number): number[] {
  const next = mulberry32(seed ^ 0x9e3779b9);

  switch (shape) {
    case 'nearly-sorted': {
      const values = randomArray(size, seed).sort((a, b) => a - b);
      const swaps = Math.max(1, Math.floor(size / 12));
      for (let i = 0; i < swaps; i++) {
        const a = Math.floor(next() * size);
        const b = Math.floor(next() * size);
        [values[a], values[b]] = [values[b], values[a]];
      }
      return values;
    }
    case 'reversed':
      return randomArray(size, seed).sort((a, b) => b - a);
    case 'few-unique': {
      const pool = randomArray(Math.max(2, Math.ceil(size / 12)), seed);
      return Array.from({ length: size }, () => pool[Math.floor(next() * pool.length)]);
    }
    case 'random':
    default:
      return randomArray(size, seed);
  }
}

/** Ascending array with distinct-ish values — the input the ordered searches need. */
export function randomSortedArray(size: number, seed: number): number[] {
  const next = mulberry32(seed);
  const values: number[] = [];
  let current = VALUE_RANGE.min;
  for (let i = 0; i < size; i++) {
    current += 1 + Math.floor(next() * 12);
    values.push(current);
  }
  return values;
}
