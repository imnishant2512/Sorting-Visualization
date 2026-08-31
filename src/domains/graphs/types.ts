export interface GraphNode {
  x: number;
  y: number;
  label: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

/**
 * Flat maps rather than nested adjacency objects: adding or removing an edge is
 * then a single-entry insert or delete, which makes the inverse trivial.
 */
export interface GraphState {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  /** Traversal results — all append-only, so all invert by popping. */
  visited: string[];
  frontier: string[];
  pathEdges: string[];
  dist: Record<string, number>;
  pointer: string | null;
  note: string | null;
}

export type GraphStep =
  | { kind: 'addNode'; id: string; node: GraphNode; line?: number }
  | { kind: 'removeNode'; id: string; node: GraphNode; line?: number }
  | { kind: 'addEdge'; id: string; edge: GraphEdge; line?: number }
  | { kind: 'removeEdge'; id: string; edge: GraphEdge; line?: number }
  | { kind: 'visit'; id: string; line?: number }
  | { kind: 'frontier'; id: string; line?: number }
  | { kind: 'relax'; id: string; dist: number; prevDist: number | undefined; line?: number }
  | { kind: 'pathEdge'; id: string; line?: number }
  | { kind: 'pointer'; id: string | null; prevId: string | null; line?: number }
  | {
      kind: 'clear';
      prevVisited: string[];
      prevFrontier: string[];
      prevPathEdges: string[];
      prevDist: Record<string, number>;
      prevPointer: string | null;
      prevNote: string | null;
      line?: number;
    }
  | { kind: 'note'; note: string | null; prevNote: string | null; line?: number };

export interface GraphArgs {
  x: number;
  y: number;
  nodeId: string | null;
  edgeId: string | null;
  from: string | null;
  to: string | null;
}

export const GRAPH_STAT_KEYS = ['visited', 'discovered', 'relaxations', 'edits'] as const;

/** Edge weights are derived from on-screen distance, which keeps A*'s heuristic admissible. */
export const DISTANCE_SCALE = 42;

export function euclidean(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function weightBetween(a: GraphNode, b: GraphNode): number {
  return Math.max(1, Math.round(euclidean(a, b) / DISTANCE_SCALE));
}
