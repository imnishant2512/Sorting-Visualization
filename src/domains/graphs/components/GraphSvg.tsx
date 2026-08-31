import type { MouseEvent } from 'react';
import type { GraphState, GraphStep } from '../types';
import styles from './GraphSvg.module.css';

const NODE_R = 19;

interface GraphSvgProps {
  state: GraphState;
  currentStep: GraphStep | null;
  width: number;
  height: number;
  startId: string | null;
  endId: string | null;
  selectedId: string | null;
  onCanvasClick(x: number, y: number): void;
  onNodeClick(id: string): void;
  onEdgeClick(id: string): void;
}

export function GraphSvg({
  state,
  currentStep,
  width,
  height,
  startId,
  endId,
  selectedId,
  onCanvasClick,
  onNodeClick,
  onEdgeClick,
}: GraphSvgProps) {
  const visited = new Set(state.visited);
  // Frontier entries stay in the list once visited, so filter them here rather
  // than mutating state — that is what keeps every step exactly invertible.
  const frontier = new Set(state.frontier.filter((id) => !visited.has(id)));
  const pathEdges = new Set(state.pathEdges);
  const adding = currentStep?.kind === 'addNode' ? currentStep.id : null;

  const nodeClass = (id: string) => {
    if (id === startId) return styles.start;
    if (id === endId) return styles.end;
    if (state.pointer === id || id === adding) return styles.active;
    if (visited.has(id)) return styles.visited;
    if (frontier.has(id)) return styles.frontier;
    if (selectedId === id) return styles.selected;
    return styles.node;
  };

  const handleBackground = (event: MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = width / rect.width;
    onCanvasClick(
      Math.round((event.clientX - rect.left) * scale),
      Math.round((event.clientY - rect.top) * scale),
    );
  };

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label="Graph">
        <rect x={0} y={0} width={width} height={height} fill="transparent" onClick={handleBackground} />

        {Object.entries(state.edges).map(([id, edge]) => {
          const a = state.nodes[edge.from];
          const b = state.nodes[edge.to];
          if (!a || !b) return null;
          return (
            <g key={id} className={pathEdges.has(id) ? styles.pathEdge : styles.edge}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              {/* Fat transparent line so thin edges are still clickable. */}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={styles.hit}
                onClick={() => onEdgeClick(id)}
              />
              <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 5} textAnchor="middle">
                {edge.weight}
              </text>
            </g>
          );
        })}

        {Object.entries(state.nodes).map(([id, node]) => (
          <g key={id} className={nodeClass(id)} onClick={() => onNodeClick(id)}>
            <circle cx={node.x} cy={node.y} r={NODE_R} />
            <text x={node.x} y={node.y + 4} textAnchor="middle">
              {node.label}
            </text>
            {state.dist[id] !== undefined && Number.isFinite(state.dist[id]) && (
              <text x={node.x} y={node.y - NODE_R - 5} textAnchor="middle" className={styles.dist}>
                {state.dist[id]}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
