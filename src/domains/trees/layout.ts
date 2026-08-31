import type { TreeState } from './types';

export const NODE_RADIUS = 17;
export const X_SPACING = 46;
export const Y_SPACING = 62;

export interface TreeLayout {
  positions: Record<string, { x: number; y: number }>;
  /** Nodes not reachable from the root — mid-rotation, an edge is briefly detached. */
  detached: string[];
  width: number;
  height: number;
}

/**
 * In-order x-positioning: each node's x is its rank in an in-order walk, its y
 * its depth. Simple, deterministic and it never lets two nodes overlap.
 */
export function layoutTree(state: TreeState): TreeLayout {
  const positions: Record<string, { x: number; y: number }> = {};
  const seen = new Set<string>();
  let column = 0;
  let maxDepth = 0;

  const walk = (id: string | null, depth: number) => {
    // The guard also protects against a malformed cycle rather than hanging.
    if (id === null || seen.has(id) || !state.nodes[id]) return;
    seen.add(id);
    const node = state.nodes[id];
    walk(node.leftId, depth + 1);
    positions[id] = { x: column * X_SPACING + NODE_RADIUS + 8, y: depth * Y_SPACING + NODE_RADIUS + 8 };
    column += 1;
    maxDepth = Math.max(maxDepth, depth);
    walk(node.rightId, depth + 1);
  };

  walk(state.rootId, 0);

  const detached = Object.keys(state.nodes).filter((id) => !seen.has(id));

  return {
    positions,
    detached,
    width: Math.max(column, 1) * X_SPACING + NODE_RADIUS * 2,
    height: (maxDepth + 1) * Y_SPACING + NODE_RADIUS * 2,
  };
}

export interface HeapLayout {
  positions: Array<{ x: number; y: number }>;
  width: number;
  height: number;
}

/** A heap is a complete binary tree, so positions come straight from the index. */
export function layoutHeap(count: number, width: number): HeapLayout {
  const levels = count === 0 ? 1 : Math.floor(Math.log2(count)) + 1;
  const positions = Array.from({ length: count }, (_, i) => {
    const depth = Math.floor(Math.log2(i + 1));
    const offset = i - (2 ** depth - 1);
    const slots = 2 ** depth;
    return {
      x: ((offset + 0.5) / slots) * width,
      y: depth * Y_SPACING + NODE_RADIUS + 8,
    };
  });
  return { positions, width, height: levels * Y_SPACING + NODE_RADIUS * 2 };
}

export function parentOfIndex(i: number): number {
  return Math.floor((i - 1) / 2);
}
