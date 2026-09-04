import { describe, expect, it } from 'vitest';
import { edgeBetween, emptyGraph, graphEngine, neighboursOf, sampleGraph } from './engine';
import {
  GRAPH_OPERATIONS,
  GRAPH_RUN_OPERATIONS,
  addEdge,
  addNode,
  graphAstar,
  graphBfs,
  graphDfs,
  graphDijkstra,
  removeEdge,
  removeNode,
} from './operations';
import type { GraphArgs, GraphState } from './types';

function run(
  state: GraphState,
  op: (typeof GRAPH_OPERATIONS)[number],
  args: Partial<GraphArgs> = {},
): GraphState {
  const full: GraphArgs = { x: 0, y: 0, nodeId: null, edgeId: null, from: null, to: null, ...args };
  let current = state;
  for (const step of op.generate(state, full)) current = graphEngine.applyStep(current, step);
  return current;
}

/** Floyd-Warshall reference, independent of the code under test. */
function referenceCosts(state: GraphState): Record<string, Record<string, number>> {
  const ids = Object.keys(state.nodes);
  const dist: Record<string, Record<string, number>> = {};
  for (const a of ids) {
    dist[a] = {};
    for (const b of ids) dist[a][b] = a === b ? 0 : Infinity;
  }
  for (const edge of Object.values(state.edges)) {
    dist[edge.from][edge.to] = Math.min(dist[edge.from][edge.to], edge.weight);
    dist[edge.to][edge.from] = Math.min(dist[edge.to][edge.from], edge.weight);
  }
  for (const k of ids) {
    for (const i of ids) {
      for (const j of ids) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
      }
    }
  }
  return dist;
}

function pathCost(state: GraphState): number {
  return state.pathEdges.reduce((sum, id) => sum + state.edges[id].weight, 0);
}

describe('graph editing', () => {
  it('adds nodes with distinct ids and labels', () => {
    let state = emptyGraph();
    for (let i = 0; i < 4; i++) state = run(state, addNode, { x: i * 60, y: 40 });
    expect(Object.keys(state.nodes)).toHaveLength(4);
    expect(new Set(Object.values(state.nodes).map((n) => n.label)).size).toBe(4);
  });

  it('adds an edge with a distance-derived weight', () => {
    let state = emptyGraph();
    state = run(state, addNode, { x: 0, y: 0 });
    state = run(state, addNode, { x: 420, y: 0 });
    const [a, b] = Object.keys(state.nodes);
    state = run(state, addEdge, { from: a, to: b });

    const id = edgeBetween(state, a, b);
    expect(id).not.toBeNull();
    expect(state.edges[id!].weight).toBe(10);
  });

  it('refuses self-loops and duplicate edges', () => {
    let state = sampleGraph();
    const before = Object.keys(state.edges).length;
    state = run(state, addEdge, { from: 'g0', to: 'g0' });
    expect(Object.keys(state.edges)).toHaveLength(before);

    state = run(state, addEdge, { from: 'g0', to: 'g1' });
    expect(Object.keys(state.edges)).toHaveLength(before);
    expect(state.note).toMatch(/already connected/);
  });

  it('removes a node along with every edge touching it', () => {
    let state = sampleGraph();
    state = run(state, removeNode, { nodeId: 'g0' });
    expect(state.nodes.g0).toBeUndefined();
    expect(
      Object.values(state.edges).some((e) => e.from === 'g0' || e.to === 'g0'),
    ).toBe(false);
  });

  it('removes a single edge without touching its nodes', () => {
    let state = sampleGraph();
    const id = edgeBetween(state, 'g0', 'g1')!;
    state = run(state, removeEdge, { edgeId: id });
    expect(state.edges[id]).toBeUndefined();
    expect(state.nodes.g0).toBeDefined();
    expect(state.nodes.g1).toBeDefined();
  });
});

describe('traversal', () => {
  it.each([
    ['bfs', graphBfs],
    ['dfs', graphDfs],
  ])('%s reaches every connected node exactly once', (_id, op) => {
    const state = run(sampleGraph(), op, { from: 'g0' });
    expect(state.visited).toHaveLength(Object.keys(state.nodes).length);
    expect(new Set(state.visited).size).toBe(state.visited.length);
  });

  it('does not cross into a disconnected component', () => {
    let state = sampleGraph();
    state = run(state, addNode, { x: 20, y: 20 });
    const isolated = Object.keys(state.nodes).find((id) => neighboursOf(state, id).length === 0)!;

    const result = run(state, graphBfs, { from: 'g0' });
    expect(result.visited).not.toContain(isolated);
  });

  it('BFS visits the start node first', () => {
    const state = run(sampleGraph(), graphBfs, { from: 'g3' });
    expect(state.visited[0]).toBe('g3');
  });
});

describe('shortest paths', () => {
  it.each([
    ['dijkstra', graphDijkstra],
    ['astar', graphAstar],
  ])('%s matches a Floyd-Warshall reference', (_id, op) => {
    const base = sampleGraph();
    const reference = referenceCosts(base);
    const ids = Object.keys(base.nodes);

    for (const from of ids) {
      for (const to of ids) {
        if (from === to) continue;
        const result = run(base, op, { from, to });
        expect(pathCost(result), `${from} → ${to}`).toBe(reference[from][to]);
      }
    }
  });

  it('reports no route across disconnected components', () => {
    let state = sampleGraph();
    state = run(state, addNode, { x: 20, y: 20 });
    const isolated = Object.keys(state.nodes).find((id) => neighboursOf(state, id).length === 0)!;

    const result = run(state, graphDijkstra, { from: 'g0', to: isolated });
    expect(result.pathEdges).toHaveLength(0);
    expect(result.note).toMatch(/no route/);
  });

  it('A* visits no more nodes than Dijkstra', () => {
    const base = sampleGraph();
    const dij = run(base, graphDijkstra, { from: 'g0', to: 'g4' });
    const star = run(base, graphAstar, { from: 'g0', to: 'g4' });
    expect(star.visited.length).toBeLessThanOrEqual(dij.visited.length);
  });

  it('records the path cost in its note', () => {
    const state = run(sampleGraph(), graphDijkstra, { from: 'g0', to: 'g4' });
    expect(state.note).toBe(`shortest path costs ${pathCost(state)}`);
  });
});

describe('step inversion', () => {
  it.each(GRAPH_OPERATIONS.map((op) => [op.id, op] as const))('%s inverts exactly', (_id, op) => {
    const state = sampleGraph();
    const args: GraphArgs = {
      x: 100,
      y: 100,
      nodeId: 'g2',
      edgeId: edgeBetween(state, 'g0', 'g1'),
      from: 'g0',
      to: 'g4',
    };

    let current = state;
    for (const step of op.generate(state, args)) {
      const before = structuredClone(current);
      const after = graphEngine.applyStep(current, step);
      expect(graphEngine.invertStep(after, step)).toEqual(before);
      current = after;
    }
  });
});

describe('pseudocode mapping', () => {
  it('every emitted line index is in range', () => {
    const state = sampleGraph();
    const args: GraphArgs = {
      x: 10,
      y: 10,
      nodeId: 'g1',
      edgeId: edgeBetween(state, 'g0', 'g1'),
      from: 'g0',
      to: 'g4',
    };
    for (const op of GRAPH_OPERATIONS) {
      for (const step of op.generate(state, args)) {
        const line = graphEngine.lineFor?.(step);
        if (line !== undefined) expect(line, op.id).toBeLessThan(op.pseudocode.length);
      }
    }
  });
});

describe('operation naming', () => {
  /**
   * The graphs page used to derive its run-button captions from a ternary over
   * three known ids, falling through to "A*". Every operation added after that
   * was written rendered as a second, third and fourth "A*" button. Distinct
   * names are the property that was actually violated, so assert that.
   */
  it('gives every run operation its own control name', () => {
    const args: GraphArgs = {
      x: 0,
      y: 0,
      nodeId: null,
      edgeId: null,
      from: 'g0',
      to: 'g4',
    };
    const names = GRAPH_RUN_OPERATIONS.map((op) => op.shortLabel ?? op.label(args));

    expect(names.every((name) => name.trim().length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
});
