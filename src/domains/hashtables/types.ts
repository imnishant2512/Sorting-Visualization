export type HashStrategy = 'chaining' | 'probing';

/**
 * Tombstones are why open addressing needs its own slot state: deleting by
 * clearing a slot would cut the probe chain and make later keys unfindable.
 */
export interface Slot {
  key: number;
  state: 'occupied' | 'tombstone';
}

export interface HashState {
  strategy: HashStrategy;
  size: number;
  /** Chaining: many slots per bucket. Probing: at most one. */
  buckets: Slot[][];
  /** Key being hashed right now. */
  hashKey: number | null;
  /** Bucket under inspection. */
  cursor: number | null;
  /** Buckets that collided during the current operation. */
  collided: number[];
  foundAt: { bucket: number; pos: number } | null;
  note: string | null;
}

export type HashStep =
  | {
      kind: 'hash';
      key: number;
      bucket: number;
      prevKey: number | null;
      prevCursor: number | null;
      line?: number;
    }
  | { kind: 'probe'; bucket: number; attempt: number; prevCursor: number | null; line?: number }
  | { kind: 'collision'; bucket: number; line?: number }
  | { kind: 'place'; bucket: number; pos: number; key: number; line?: number }
  | {
      kind: 'remove';
      bucket: number;
      pos: number;
      key: number;
      /** Open addressing leaves a tombstone; chaining splices the entry out. */
      tombstone: boolean;
      line?: number;
    }
  | {
      kind: 'found';
      at: { bucket: number; pos: number } | null;
      prevAt: { bucket: number; pos: number } | null;
      line?: number;
    }
  | {
      kind: 'clear';
      prevKey: number | null;
      prevCursor: number | null;
      prevCollided: number[];
      prevFound: { bucket: number; pos: number } | null;
      prevNote: string | null;
      line?: number;
    }
  | { kind: 'note'; note: string | null; prevNote: string | null; line?: number };

export interface HashArgs {
  key: number;
}

export const HASH_STAT_KEYS = ['hashes', 'probes', 'collisions', 'writes'] as const;

export function hashOf(key: number, size: number): number {
  return ((key % size) + size) % size;
}
