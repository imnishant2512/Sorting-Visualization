export interface TreeNode {
  value: number;
  leftId: string | null;
  rightId: string | null;
}

export interface TreeState {
  nodes: Record<string, TreeNode>;
  rootId: string | null;
  /** Node currently being examined. */
  pointer: string | null;
  foundId: string | null;
  /** Traversal output, in visit order. */
  visited: string[];
  note: string | null;
}

/**
 * Rotations are deliberately *not* a step kind: an AVL rotation decomposes into
 * a fixed sequence of `link`/`setRoot` steps, so inversion needs no special
 * case and you can step through a rotation one pointer change at a time.
 */
export type TreeStep =
  | { kind: 'createNode'; id: string; value: number; line?: number }
  | { kind: 'deleteNode'; id: string; node: TreeNode; line?: number }
  | {
      kind: 'link';
      parentId: string;
      side: 'left' | 'right';
      childId: string | null;
      prevChildId: string | null;
      line?: number;
    }
  | { kind: 'setRoot'; rootId: string | null; prevRootId: string | null; line?: number }
  | { kind: 'setValue'; id: string; value: number; prevValue: number; line?: number }
  | { kind: 'pointer'; id: string | null; prevId: string | null; line?: number }
  | { kind: 'compare'; id: string; target: number; line?: number }
  | { kind: 'found'; id: string | null; prevId: string | null; line?: number }
  | { kind: 'visit'; id: string; line?: number }
  | { kind: 'clearVisited'; prevVisited: string[]; line?: number }
  | { kind: 'note'; note: string | null; prevNote: string | null; line?: number };

/** Heaps stay array-backed — that is how they are actually implemented. */
export interface HeapState {
  items: number[];
  pointer: number | null;
  note: string | null;
}

export type HeapStep =
  | { kind: 'push'; value: number; line?: number }
  | { kind: 'pop'; prevValue: number; line?: number }
  | { kind: 'swap'; a: number; b: number; line?: number }
  | { kind: 'compare'; a: number; b: number; line?: number }
  | { kind: 'pointer'; index: number | null; prevIndex: number | null; line?: number }
  | { kind: 'note'; note: string | null; prevNote: string | null; line?: number };

export interface TreeArgs {
  value: number;
  /** Heap operations only: min-heap when true, max-heap when false. */
  min: boolean;
}

export const TREE_STAT_KEYS = ['comparisons', 'links', 'visits'] as const;
export const HEAP_STAT_KEYS = ['comparisons', 'swaps', 'writes'] as const;
