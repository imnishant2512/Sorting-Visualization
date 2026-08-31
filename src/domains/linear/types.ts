/**
 * Array, stack and queue share one state shape and one step vocabulary — a
 * stack is just an array restricted to tail operations, a queue an array
 * restricted to tail-in/head-out. Only the linked list needs its own shape,
 * because pointer chasing is the thing it exists to show.
 */
export interface SeqState {
  items: number[];
  /** Traversal cursor for reads and searches. */
  pointer: number | null;
  /** Set when a search finds its target. */
  foundIndex: number | null;
  note: string | null;
}

export type SeqStep =
  | { kind: 'insertAt'; index: number; value: number; line?: number }
  | { kind: 'removeAt'; index: number; prevValue: number; line?: number }
  | { kind: 'read'; index: number; line?: number }
  | { kind: 'compare'; index: number; target: number; line?: number }
  | { kind: 'pointer'; index: number | null; prevIndex: number | null; line?: number }
  | { kind: 'found'; index: number | null; prevIndex: number | null; line?: number }
  | { kind: 'note'; note: string | null; prevNote: string | null; line?: number };

export interface ListNode {
  value: number;
  nextId: string | null;
}

export interface ListState {
  nodes: Record<string, ListNode>;
  headId: string | null;
  pointer: string | null;
  foundId: string | null;
  note: string | null;
}

export type ListStep =
  | { kind: 'createNode'; id: string; value: number; nextId: string | null; line?: number }
  | { kind: 'deleteNode'; id: string; value: number; nextId: string | null; line?: number }
  | { kind: 'setNext'; id: string; nextId: string | null; prevNextId: string | null; line?: number }
  | { kind: 'setHead'; headId: string | null; prevHeadId: string | null; line?: number }
  | { kind: 'pointer'; id: string | null; prevId: string | null; line?: number }
  | { kind: 'compare'; id: string; target: number; line?: number }
  | { kind: 'found'; id: string | null; prevId: string | null; line?: number }
  | { kind: 'note'; note: string | null; prevNote: string | null; line?: number };

export const LINEAR_STAT_KEYS = ['reads', 'writes', 'comparisons', 'pointerMoves'] as const;

export type LinearVariant = 'array' | 'stack' | 'queue' | 'linked-list';
