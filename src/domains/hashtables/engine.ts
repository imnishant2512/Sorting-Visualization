import type { StatCounters, StepEngine } from '../../engine/types';
import type { HashState, HashStep, HashStrategy, Slot } from './types';

function withBucket(state: HashState, bucket: number, next: Slot[]): HashState {
  const buckets = [...state.buckets];
  buckets[bucket] = next;
  return { ...state, buckets };
}

export const hashEngine: StepEngine<HashState, HashStep> = {
  applyStep(state, step) {
    switch (step.kind) {
      case 'hash':
        return { ...state, hashKey: step.key, cursor: step.bucket };
      case 'probe':
        return { ...state, cursor: step.bucket };
      case 'collision':
        return { ...state, collided: [...state.collided, step.bucket] };
      case 'place': {
        const slots = [...state.buckets[step.bucket]];
        slots.splice(step.pos, 0, { key: step.key, state: 'occupied' });
        return withBucket(state, step.bucket, slots);
      }
      case 'remove': {
        const slots = [...state.buckets[step.bucket]];
        if (step.tombstone) slots[step.pos] = { key: step.key, state: 'tombstone' };
        else slots.splice(step.pos, 1);
        return withBucket(state, step.bucket, slots);
      }
      case 'found':
        return { ...state, foundAt: step.at };
      case 'clear':
        return { ...state, hashKey: null, cursor: null, collided: [], foundAt: null, note: null };
      case 'note':
        return { ...state, note: step.note };
      default:
        return state;
    }
  },

  invertStep(state, step) {
    switch (step.kind) {
      case 'hash':
        return { ...state, hashKey: step.prevKey, cursor: step.prevCursor };
      case 'probe':
        return { ...state, cursor: step.prevCursor };
      case 'collision':
        // Only `collision` appends, so dropping the last entry is exact.
        return { ...state, collided: state.collided.slice(0, -1) };
      case 'place': {
        const slots = [...state.buckets[step.bucket]];
        slots.splice(step.pos, 1);
        return withBucket(state, step.bucket, slots);
      }
      case 'remove': {
        const slots = [...state.buckets[step.bucket]];
        if (step.tombstone) slots[step.pos] = { key: step.key, state: 'occupied' };
        else slots.splice(step.pos, 0, { key: step.key, state: 'occupied' });
        return withBucket(state, step.bucket, slots);
      }
      case 'found':
        return { ...state, foundAt: step.prevAt };
      case 'clear':
        return {
          ...state,
          hashKey: step.prevKey,
          cursor: step.prevCursor,
          collided: [...step.prevCollided],
          foundAt: step.prevFound,
          note: step.prevNote,
        };
      case 'note':
        return { ...state, note: step.prevNote };
      default:
        return state;
    }
  },

  statsDelta(step): Partial<StatCounters> {
    switch (step.kind) {
      case 'hash':
        return { hashes: 1 };
      case 'probe':
        return { probes: 1 };
      case 'collision':
        return { collisions: 1 };
      case 'place':
      case 'remove':
        return { writes: 1 };
      default:
        return {};
    }
  },

  lineFor: (step) => step.line,
};

export function initHashState(strategy: HashStrategy, size = 11, keys: number[] = []): HashState {
  const state: HashState = {
    strategy,
    size,
    buckets: Array.from({ length: size }, () => []),
    hashKey: null,
    cursor: null,
    collided: [],
    foundAt: null,
    note: null,
  };

  // Seed without steps — this is the starting table, not an operation.
  for (const key of keys) {
    const home = ((key % size) + size) % size;
    if (strategy === 'chaining') {
      state.buckets[home].push({ key, state: 'occupied' });
    } else {
      for (let i = 0; i < size; i++) {
        const bucket = (home + i) % size;
        if (state.buckets[bucket].length === 0) {
          state.buckets[bucket] = [{ key, state: 'occupied' }];
          break;
        }
      }
    }
  }
  return state;
}

export function liveKeys(state: HashState): number[] {
  return state.buckets.flatMap((slots) =>
    slots.filter((slot) => slot.state === 'occupied').map((slot) => slot.key),
  );
}

export function loadFactor(state: HashState): number {
  return liveKeys(state).length / state.size;
}
