import type { StructureOperation } from '../../engine/useInteractiveStructure';
import { edgeBetween, neighboursOf } from './engine';
import type { GraphArgs, GraphState, GraphStep } from './types';
import { DISTANCE_SCALE, euclidean, weightBetween } from './types';

export type GraphOperation = StructureOperation<GraphState, GraphStep, GraphArgs>;

function* clearMarks(state: GraphState): Generator<GraphStep> {
  if (
    state.visited.length === 0 &&
    state.frontier.length === 0 &&
    state.pathEdges.length === 0 &&
    Object.keys(state.dist).length === 0 &&
    state.pointer === null &&
    state.note === null
  ) {
    return;
  }
  yield {
    kind: 'clear',
    prevVisited: [...state.visited],
    prevFrontier: [...state.frontier],
    prevPathEdges: [...state.pathEdges],
    prevDist: { ...state.dist },
    prevPointer: state.pointer,
    prevNote: state.note,
  };
}

function freshNodeId(state: GraphState): string {
  let max = -1;
  for (const id of Object.keys(state.nodes)) {
    const n = Number(id.slice(1));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `g${max + 1}`;
}

function nextLabel(state: GraphState): string {
  const used = new Set(Object.values(state.nodes).map((n) => n.label));
  for (let i = 0; i < 26 * 2; i++) {
    const label = i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(65 + (i - 26))}2`;
    if (!used.has(label)) return label;
  }
  return `n${Object.keys(state.nodes).length}`;
}

/* ------------------------------------------------------------ graph edits */

export const addNode: GraphOperation = {
  id: 'add-node',
  label: () => 'Add node',
  pseudocode: ['addNode(x, y):', '  nodes[id] = { x, y }'],
  *generate(state, { x, y }) {
    yield* clearMarks(state);
    const id = freshNodeId(state);
    yield { kind: 'addNode', id, node: { x, y, label: nextLabel(state) }, line: 1 };
  },
};

export const removeNode: GraphOperation = {
  id: 'remove-node',
  label: () => 'Remove node',
  pseudocode: ['removeNode(id):', '  drop every edge touching it', '  delete nodes[id]'],
  *generate(state, { nodeId }) {
    yield* clearMarks(state);
    if (!nodeId || !state.nodes[nodeId]) return;

    // Edges must go first or the graph would keep dangling references.
    for (const [edgeId, edge] of Object.entries(state.edges)) {
      if (edge.from === nodeId || edge.to === nodeId) {
        yield { kind: 'removeEdge', id: edgeId, edge: { ...edge }, line: 1 };
      }
    }
    yield { kind: 'removeNode', id: nodeId, node: { ...state.nodes[nodeId] }, line: 2 };
  },
};

export const addEdge: GraphOperation = {
  id: 'add-edge',
  label: () => 'Add edge',
  pseudocode: [
    'addEdge(a, b):',
    '  weight = round(distance(a, b) / scale)',
    '  edges[id] = { a, b, weight }',
  ],
  *generate(state, { from, to }) {
    yield* clearMarks(state);
    if (!from || !to || from === to) return;
    if (!state.nodes[from] || !state.nodes[to]) return;
    if (edgeBetween(state, from, to)) {
      yield { kind: 'note', note: 'those nodes are already connected', prevNote: null, line: 0 };
      return;
    }
    yield {
      kind: 'addEdge',
      id: `${from}-${to}`,
      edge: { from, to, weight: weightBetween(state.nodes[from], state.nodes[to]) },
      line: 2,
    };
  },
};

export const removeEdge: GraphOperation = {
  id: 'remove-edge',
  label: () => 'Remove edge',
  pseudocode: ['removeEdge(id):', '  delete edges[id]'],
  *generate(state, { edgeId }) {
    yield* clearMarks(state);
    if (!edgeId || !state.edges[edgeId]) return;
    yield { kind: 'removeEdge', id: edgeId, edge: { ...state.edges[edgeId] }, line: 1 };
  },
};

/* -------------------------------------------------------------- traversal */

export const graphBfs: GraphOperation = {
  id: 'bfs',
  label: ({ from }) => `BFS from ${from ?? '?'}`,
  readOnly: true,
  pseudocode: [
    'bfs(start):',
    '  queue = [start]',
    '  while queue is not empty',
    '    node = queue.shift()',
    '    push every unseen neighbour',
  ],
  *generate(state, { from }) {
    yield* clearMarks(state);
    if (!from || !state.nodes[from]) return;

    const seen = new Set([from]);
    const queue = [from];
    let prevPointer: string | null = null;
    yield { kind: 'frontier', id: from, line: 1 };

    while (queue.length > 0) {
      const id = queue.shift()!;
      yield { kind: 'pointer', id, prevId: prevPointer, line: 3 };
      prevPointer = id;
      yield { kind: 'visit', id, line: 3 };
      for (const { to } of neighboursOf(state, id)) {
        if (seen.has(to)) continue;
        seen.add(to);
        queue.push(to);
        yield { kind: 'frontier', id: to, line: 4 };
      }
    }
    yield { kind: 'pointer', id: null, prevId: prevPointer, line: 4 };
  },
};

export const graphDfs: GraphOperation = {
  id: 'dfs',
  label: ({ from }) => `DFS from ${from ?? '?'}`,
  readOnly: true,
  pseudocode: [
    'dfs(start):',
    '  stack = [start]',
    '  while stack is not empty',
    '    node = stack.pop()',
    '    push every unseen neighbour',
  ],
  *generate(state, { from }) {
    yield* clearMarks(state);
    if (!from || !state.nodes[from]) return;

    const seen = new Set([from]);
    const stack = [from];
    let prevPointer: string | null = null;
    yield { kind: 'frontier', id: from, line: 1 };

    while (stack.length > 0) {
      const id = stack.pop()!;
      yield { kind: 'pointer', id, prevId: prevPointer, line: 3 };
      prevPointer = id;
      yield { kind: 'visit', id, line: 3 };
      for (const { to } of neighboursOf(state, id)) {
        if (seen.has(to)) continue;
        seen.add(to);
        stack.push(to);
        yield { kind: 'frontier', id: to, line: 4 };
      }
    }
    yield { kind: 'pointer', id: null, prevId: prevPointer, line: 4 };
  },
};

/**
 * Dijkstra and A* again share one generator — the heuristic is the only
 * difference. Because edge weights are derived from on-screen distance, the
 * straight-line estimate never overestimates, so A* stays admissible.
 */
function* shortestPath(
  state: GraphState,
  from: string,
  to: string | null,
  heuristic: (id: string) => number,
): Generator<GraphStep> {
  const dist: Record<string, number> = { [from]: 0 };
  const prevEdge: Record<string, { edgeId: string; from: string }> = {};
  const open = new Set([from]);
  const done = new Set<string>();
  let prevPointer: string | null = null;

  yield { kind: 'frontier', id: from, line: 1 };
  yield { kind: 'relax', id: from, dist: 0, prevDist: undefined, line: 1 };

  while (open.size > 0) {
    let best: string | null = null;
    let bestScore = Infinity;
    for (const candidate of open) {
      const score = dist[candidate] + heuristic(candidate);
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (best === null) break;

    open.delete(best);
    done.add(best);
    yield { kind: 'pointer', id: best, prevId: prevPointer, line: 2 };
    prevPointer = best;
    yield { kind: 'visit', id: best, line: 2 };

    if (to && best === to) break;

    for (const { edgeId, to: next } of neighboursOf(state, best)) {
      if (done.has(next)) continue;
      const candidate = dist[best] + state.edges[edgeId].weight;
      if (dist[next] !== undefined && candidate >= dist[next]) continue;

      if (!open.has(next)) {
        open.add(next);
        yield { kind: 'frontier', id: next, line: 3 };
      }
      yield { kind: 'relax', id: next, dist: candidate, prevDist: dist[next], line: 4 };
      dist[next] = candidate;
      prevEdge[next] = { edgeId, from: best };
    }
  }

  yield { kind: 'pointer', id: null, prevId: prevPointer, line: 4 };

  if (!to) return;
  if (dist[to] === undefined) {
    yield { kind: 'note', note: 'no route between those nodes', prevNote: null, line: 4 };
    return;
  }

  let cursor = to;
  const chain: string[] = [];
  while (cursor !== from) {
    const link = prevEdge[cursor];
    if (!link) break;
    chain.push(link.edgeId);
    cursor = link.from;
  }
  for (const edgeId of chain.reverse()) {
    yield { kind: 'pathEdge', id: edgeId, line: 4 };
  }
  yield { kind: 'note', note: `shortest path costs ${dist[to]}`, prevNote: null, line: 4 };
}

export const graphDijkstra: GraphOperation = {
  id: 'dijkstra',
  label: ({ from, to }) => `Dijkstra ${from ?? '?'} → ${to ?? '?'}`,
  readOnly: true,
  pseudocode: [
    'dijkstra(start, goal):',
    '  dist[start] = 0; open = {start}',
    '  take the open node with the smallest dist',
    '  relax each neighbour: dist[n] = dist[node] + weight',
    '  walk the parent links back for the route',
  ],
  *generate(state, { from, to }) {
    yield* clearMarks(state);
    if (!from || !state.nodes[from]) return;
    yield* shortestPath(state, from, to, () => 0);
  },
};

export const graphAstar: GraphOperation = {
  id: 'astar',
  label: ({ from, to }) => `A* ${from ?? '?'} → ${to ?? '?'}`,
  readOnly: true,
  pseudocode: [
    'a*(start, goal):',
    '  dist[start] = 0; open = {start}',
    '  take the open node minimising dist + straight-line estimate',
    '  relax each neighbour as in Dijkstra',
    '  walk the parent links back for the route',
  ],
  *generate(state, { from, to }) {
    yield* clearMarks(state);
    if (!from || !state.nodes[from]) return;
    if (!to || !state.nodes[to]) {
      yield { kind: 'note', note: 'A* needs a goal node — pick one', prevNote: null, line: 0 };
      return;
    }
    const goal = state.nodes[to];
    yield* shortestPath(state, from, to, (id) =>
      state.nodes[id] ? euclidean(state.nodes[id], goal) / DISTANCE_SCALE : 0,
    );
  },
};

export const GRAPH_EDIT_OPERATIONS: GraphOperation[] = [addNode, addEdge, removeNode, removeEdge];
export const GRAPH_RUN_OPERATIONS: GraphOperation[] = [
  graphBfs,
  graphDfs,
  graphDijkstra,
  graphAstar,
];
export const GRAPH_OPERATIONS: GraphOperation[] = [
  ...GRAPH_EDIT_OPERATIONS,
  ...GRAPH_RUN_OPERATIONS,
];
