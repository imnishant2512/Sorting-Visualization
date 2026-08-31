import { describe, expect, it } from 'vitest';
import { hashEngine, initHashState, liveKeys } from './engine';
import { HASH_OPERATIONS, hashInsert, hashLookup, hashRemove } from './operations';
import { hashOf, type HashState, type HashStrategy } from './types';

function run(state: HashState, op: (typeof HASH_OPERATIONS)[number], key: number): HashState {
  let current = state;
  for (const step of op.generate(state, { key })) current = hashEngine.applyStep(current, step);
  return current;
}

const found = (state: HashState, key: number) => run(state, hashLookup, key).foundAt !== null;

describe.each<HashStrategy>(['chaining', 'probing'])('%s', (strategy) => {
  it('stores and finds every inserted key', () => {
    let state = initHashState(strategy, 11);
    const keys = [5, 16, 27, 3, 14, 9, 20];
    for (const key of keys) state = run(state, hashInsert, key);

    expect(liveKeys(state).sort((a, b) => a - b)).toEqual([...keys].sort((a, b) => a - b));
    for (const key of keys) expect(found(state, key), `key ${key}`).toBe(true);
  });

  it('does not find keys that were never inserted', () => {
    let state = initHashState(strategy, 11);
    for (const key of [5, 16, 27]) state = run(state, hashInsert, key);
    for (const key of [4, 15, 100]) expect(found(state, key), `key ${key}`).toBe(false);
  });

  it('rejects duplicate keys', () => {
    let state = initHashState(strategy, 11);
    state = run(state, hashInsert, 7);
    state = run(state, hashInsert, 7);
    expect(liveKeys(state)).toEqual([7]);
    expect(state.note).toMatch(/already/);
  });

  it('removes a key so it is no longer found', () => {
    let state = initHashState(strategy, 11);
    for (const key of [5, 16, 27]) state = run(state, hashInsert, key);
    state = run(state, hashRemove, 16);
    expect(found(state, 16)).toBe(false);
    expect(found(state, 5)).toBe(true);
    expect(found(state, 27)).toBe(true);
  });

  it('keeps colliding keys reachable after one of them is removed', () => {
    // 5, 16 and 27 all hash to bucket 5 with size 11.
    let state = initHashState(strategy, 11);
    for (const key of [5, 16, 27]) state = run(state, hashInsert, key);
    expect(hashOf(5, 11)).toBe(hashOf(16, 11));

    state = run(state, hashRemove, 5);
    // Exactly the case a naive delete breaks under linear probing.
    expect(found(state, 16)).toBe(true);
    expect(found(state, 27)).toBe(true);
  });

  it('reuses freed space on later inserts', () => {
    let state = initHashState(strategy, 7);
    for (const key of [1, 8, 15]) state = run(state, hashInsert, key);
    state = run(state, hashRemove, 8);
    state = run(state, hashInsert, 22);
    expect(found(state, 22)).toBe(true);
    expect(found(state, 15)).toBe(true);
    expect(found(state, 8)).toBe(false);
  });

  it('stays consistent through a randomised sequence', () => {
    let state = initHashState(strategy, 13);
    const mirror = new Set<number>();

    for (let i = 0; i < 120; i++) {
      const key = Math.floor(Math.random() * 60);
      if (Math.random() < 0.62) {
        if (mirror.size < 12) {
          state = run(state, hashInsert, key);
          mirror.add(key);
        }
      } else {
        state = run(state, hashRemove, key);
        mirror.delete(key);
      }
      expect(liveKeys(state).sort((a, b) => a - b)).toEqual([...mirror].sort((a, b) => a - b));
    }

    for (const key of mirror) expect(found(state, key), `key ${key}`).toBe(true);
  });

  it('every step inverts exactly', () => {
    let state = initHashState(strategy, 11);
    for (const key of [5, 16, 27, 3]) state = run(state, hashInsert, key);

    for (const op of HASH_OPERATIONS) {
      let current = state;
      for (const step of op.generate(state, { key: 16 })) {
        const before = structuredClone(current);
        const after = hashEngine.applyStep(current, step);
        expect(hashEngine.invertStep(after, step)).toEqual(before);
        current = after;
      }
    }
  });

  it('emits only valid pseudocode line indices', () => {
    const state = initHashState(strategy, 11, [5, 16, 27]);
    for (const op of HASH_OPERATIONS) {
      for (const step of op.generate(state, { key: 16 })) {
        const line = hashEngine.lineFor?.(step);
        if (line !== undefined) expect(line, op.id).toBeLessThan(op.pseudocode.length);
      }
    }
  });
});

describe('open addressing specifics', () => {
  it('leaves a tombstone rather than an empty slot', () => {
    let state = initHashState('probing', 11);
    for (const key of [5, 16]) state = run(state, hashInsert, key);
    state = run(state, hashRemove, 5);
    expect(state.buckets[5][0]).toEqual({ key: 5, state: 'tombstone' });
  });

  it('reports a full table instead of looping forever', () => {
    let state = initHashState('probing', 3);
    for (const key of [1, 2, 3, 4]) state = run(state, hashInsert, key);
    expect(liveKeys(state)).toHaveLength(3);
    expect(state.note).toMatch(/full/);
  });

  it('counts collisions when keys share a home bucket', () => {
    let state = initHashState('probing', 11);
    state = run(state, hashInsert, 5);
    const steps = [...hashInsert.generate(state, { key: 16 })];
    expect(steps.filter((s) => s.kind === 'collision').length).toBeGreaterThan(0);
  });
});

describe('chaining specifics', () => {
  it('grows a chain in one bucket instead of probing', () => {
    let state = initHashState('chaining', 11);
    for (const key of [5, 16, 27]) state = run(state, hashInsert, key);
    expect(state.buckets[5].map((s) => s.key)).toEqual([5, 16, 27]);
    expect(state.buckets.filter((b) => b.length > 0)).toHaveLength(1);
  });

  it('splices out of the chain, leaving no tombstone', () => {
    let state = initHashState('chaining', 11);
    for (const key of [5, 16, 27]) state = run(state, hashInsert, key);
    state = run(state, hashRemove, 16);
    expect(state.buckets[5].map((s) => s.key)).toEqual([5, 27]);
    expect(state.buckets[5].every((s) => s.state === 'occupied')).toBe(true);
  });
});
