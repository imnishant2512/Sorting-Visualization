import type { StatCounters, StepEngine } from '../../engine/types';
import type { HeapState, HeapStep, TreeNode, TreeState, TreeStep } from './types';

export const treeEngine: StepEngine<TreeState, TreeStep> = {
  applyStep(state, step) {
    switch (step.kind) {
      case 'createNode':
        return {
          ...state,
          nodes: { ...state.nodes, [step.id]: { value: step.value, leftId: null, rightId: null } },
        };
      case 'deleteNode': {
        const nodes = { ...state.nodes };
        delete nodes[step.id];
        return { ...state, nodes };
      }
      case 'link': {
        const parent = state.nodes[step.parentId];
        const key = step.side === 'left' ? 'leftId' : 'rightId';
        return {
          ...state,
          nodes: { ...state.nodes, [step.parentId]: { ...parent, [key]: step.childId } },
        };
      }
      case 'setRoot':
        return { ...state, rootId: step.rootId };
      case 'setValue':
        return {
          ...state,
          nodes: { ...state.nodes, [step.id]: { ...state.nodes[step.id], value: step.value } },
        };
      case 'pointer':
        return { ...state, pointer: step.id };
      case 'found':
        return { ...state, foundId: step.id };
      case 'visit':
        return { ...state, visited: [...state.visited, step.id] };
      case 'clearVisited':
        return { ...state, visited: [] };
      case 'note':
        return { ...state, note: step.note };
      default:
        return state;
    }
  },

  invertStep(state, step) {
    switch (step.kind) {
      case 'createNode': {
        const nodes = { ...state.nodes };
        delete nodes[step.id];
        return { ...state, nodes };
      }
      case 'deleteNode':
        return { ...state, nodes: { ...state.nodes, [step.id]: { ...step.node } } };
      case 'link': {
        const parent = state.nodes[step.parentId];
        const key = step.side === 'left' ? 'leftId' : 'rightId';
        return {
          ...state,
          nodes: { ...state.nodes, [step.parentId]: { ...parent, [key]: step.prevChildId } },
        };
      }
      case 'setRoot':
        return { ...state, rootId: step.prevRootId };
      case 'setValue':
        return {
          ...state,
          nodes: { ...state.nodes, [step.id]: { ...state.nodes[step.id], value: step.prevValue } },
        };
      case 'pointer':
        return { ...state, pointer: step.prevId };
      case 'found':
        return { ...state, foundId: step.prevId };
      case 'visit':
        // Only `visit` appends, so dropping the last entry is exact.
        return { ...state, visited: state.visited.slice(0, -1) };
      case 'clearVisited':
        return { ...state, visited: [...step.prevVisited] };
      case 'note':
        return { ...state, note: step.prevNote };
      default:
        return state;
    }
  },

  statsDelta(step): Partial<StatCounters> {
    switch (step.kind) {
      case 'compare':
        return { comparisons: 1 };
      case 'link':
      case 'setRoot':
      case 'createNode':
      case 'deleteNode':
        return { links: 1 };
      case 'visit':
        return { visits: 1 };
      default:
        return {};
    }
  },

  lineFor: (step) => step.line,
};

export const heapEngine: StepEngine<HeapState, HeapStep> = {
  applyStep(state, step) {
    switch (step.kind) {
      case 'push':
        return { ...state, items: [...state.items, step.value] };
      case 'pop':
        return { ...state, items: state.items.slice(0, -1) };
      case 'swap': {
        const items = [...state.items];
        const tmp = items[step.a];
        items[step.a] = items[step.b];
        items[step.b] = tmp;
        return { ...state, items };
      }
      case 'pointer':
        return { ...state, pointer: step.index };
      case 'note':
        return { ...state, note: step.note };
      default:
        return state;
    }
  },

  invertStep(state, step) {
    switch (step.kind) {
      case 'push':
        return { ...state, items: state.items.slice(0, -1) };
      case 'pop':
        return { ...state, items: [...state.items, step.prevValue] };
      case 'swap': {
        const items = [...state.items];
        const tmp = items[step.a];
        items[step.a] = items[step.b];
        items[step.b] = tmp;
        return { ...state, items };
      }
      case 'pointer':
        return { ...state, pointer: step.prevIndex };
      case 'note':
        return { ...state, note: step.prevNote };
      default:
        return state;
    }
  },

  statsDelta(step): Partial<StatCounters> {
    switch (step.kind) {
      case 'compare':
        return { comparisons: 1 };
      case 'swap':
        return { swaps: 1, writes: 2 };
      case 'push':
      case 'pop':
        return { writes: 1 };
      default:
        return {};
    }
  },

  lineFor: (step) => step.line,
};

export function initTreeState(values: number[] = []): TreeState {
  const state: TreeState = {
    nodes: {},
    rootId: null,
    pointer: null,
    foundId: null,
    visited: [],
    note: null,
  };

  // Plain BST insert, no steps — this is the seed, not an operation.
  values.forEach((value, index) => {
    const id = `t${index}`;
    state.nodes[id] = { value, leftId: null, rightId: null };
    if (state.rootId === null) {
      state.rootId = id;
      return;
    }
    let cursor = state.rootId;
    for (;;) {
      const node = state.nodes[cursor];
      if (value < node.value) {
        if (node.leftId === null) {
          node.leftId = id;
          return;
        }
        cursor = node.leftId;
      } else {
        if (node.rightId === null) {
          node.rightId = id;
          return;
        }
        cursor = node.rightId;
      }
    }
  });

  return state;
}

export function initHeapState(items: number[] = []): HeapState {
  return { items: [...items], pointer: null, note: null };
}

/** In-order values — sorted for any valid BST. */
export function inorderValues(state: TreeState): number[] {
  const out: number[] = [];
  const walk = (id: string | null) => {
    if (id === null) return;
    const node = state.nodes[id];
    walk(node.leftId);
    out.push(node.value);
    walk(node.rightId);
  };
  walk(state.rootId);
  return out;
}

export function nodeHeight(state: TreeState, id: string | null): number {
  if (id === null) return 0;
  const node = state.nodes[id];
  return 1 + Math.max(nodeHeight(state, node.leftId), nodeHeight(state, node.rightId));
}

export function countNodes(state: TreeState): number {
  return Object.keys(state.nodes).length;
}

/** Working copy the generators mutate, mirroring what applyStep produces. */
export class TreeCtx {
  nodes: Record<string, TreeNode>;
  rootId: string | null;
  private currentPointer: string | null;
  private currentFound: string | null;
  private currentNote: string | null;
  private currentVisited: string[];

  constructor(state: TreeState) {
    this.nodes = Object.fromEntries(
      Object.entries(state.nodes).map(([id, node]) => [id, { ...node }]),
    );
    this.rootId = state.rootId;
    this.currentPointer = state.pointer;
    this.currentFound = state.foundId;
    this.currentNote = state.note;
    this.currentVisited = [...state.visited];
  }

  freshId(): string {
    let max = -1;
    for (const id of Object.keys(this.nodes)) {
      const n = Number(id.slice(1));
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `t${max + 1}`;
  }

  height(id: string | null): number {
    if (id === null) return 0;
    const node = this.nodes[id];
    return 1 + Math.max(this.height(node.leftId), this.height(node.rightId));
  }

  balance(id: string): number {
    const node = this.nodes[id];
    return this.height(node.leftId) - this.height(node.rightId);
  }

  parentOf(id: string): string | null {
    for (const [candidate, node] of Object.entries(this.nodes)) {
      if (node.leftId === id || node.rightId === id) return candidate;
    }
    return null;
  }

  *createNode(id: string, value: number, line?: number): Generator<TreeStep> {
    this.nodes[id] = { value, leftId: null, rightId: null };
    yield { kind: 'createNode', id, value, line };
  }

  *deleteNode(id: string, line?: number): Generator<TreeStep> {
    const node = { ...this.nodes[id] };
    delete this.nodes[id];
    yield { kind: 'deleteNode', id, node, line };
  }

  *link(
    parentId: string,
    side: 'left' | 'right',
    childId: string | null,
    line?: number,
  ): Generator<TreeStep> {
    const key = side === 'left' ? 'leftId' : 'rightId';
    const prevChildId = this.nodes[parentId][key];
    this.nodes[parentId] = { ...this.nodes[parentId], [key]: childId };
    yield { kind: 'link', parentId, side, childId, prevChildId, line };
  }

  *setRoot(rootId: string | null, line?: number): Generator<TreeStep> {
    const prevRootId = this.rootId;
    this.rootId = rootId;
    yield { kind: 'setRoot', rootId, prevRootId, line };
  }

  *setValue(id: string, value: number, line?: number): Generator<TreeStep> {
    const prevValue = this.nodes[id].value;
    this.nodes[id] = { ...this.nodes[id], value };
    yield { kind: 'setValue', id, value, prevValue, line };
  }

  *pointer(id: string | null, line?: number): Generator<TreeStep> {
    const prevId = this.currentPointer;
    if (prevId === id) return;
    this.currentPointer = id;
    yield { kind: 'pointer', id, prevId, line };
  }

  *compare(id: string, target: number, line?: number): Generator<TreeStep> {
    yield { kind: 'compare', id, target, line };
  }

  *found(id: string | null, line?: number): Generator<TreeStep> {
    const prevId = this.currentFound;
    if (prevId === id) return;
    this.currentFound = id;
    yield { kind: 'found', id, prevId, line };
  }

  *visit(id: string, line?: number): Generator<TreeStep> {
    this.currentVisited.push(id);
    yield { kind: 'visit', id, line };
  }

  *clearVisited(line?: number): Generator<TreeStep> {
    if (this.currentVisited.length === 0) return;
    const prevVisited = [...this.currentVisited];
    this.currentVisited = [];
    yield { kind: 'clearVisited', prevVisited, line };
  }

  *note(note: string | null, line?: number): Generator<TreeStep> {
    const prevNote = this.currentNote;
    if (prevNote === note) return;
    this.currentNote = note;
    yield { kind: 'note', note, prevNote, line };
  }

  /** Re-parents `child` under whatever pointed at `oldChild`. */
  *replaceChild(
    parentId: string | null,
    oldChildId: string,
    newChildId: string | null,
    line?: number,
  ): Generator<TreeStep> {
    if (parentId === null) {
      yield* this.setRoot(newChildId, line);
      return;
    }
    const side = this.nodes[parentId].leftId === oldChildId ? 'left' : 'right';
    yield* this.link(parentId, side, newChildId, line);
  }
}
