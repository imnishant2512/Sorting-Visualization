import { NODE_RADIUS, X_SPACING, Y_SPACING, layoutTree } from '../layout';
import type { TreeState, TreeStep } from '../types';
import styles from './TreeSvg.module.css';

interface TreeSvgProps {
  state: TreeState;
  currentStep: TreeStep | null;
}

export function TreeSvg({ state, currentStep }: TreeSvgProps) {
  const layout = layoutTree(state);
  const comparing = currentStep?.kind === 'compare' ? currentStep.id : null;
  const visitedSet = new Set(state.visited);

  const detachedY = layout.height + 18;
  const height = layout.detached.length > 0 ? detachedY + Y_SPACING : layout.height;

  const classFor = (id: string) => {
    if (state.foundId === id) return styles.found;
    if (comparing === id) return styles.comparing;
    if (state.pointer === id) return styles.pointer;
    if (visitedSet.has(id)) return styles.visited;
    return styles.node;
  };

  return (
    <div className={styles.wrap}>
      {state.rootId === null && layout.detached.length === 0 && (
        <p className={styles.empty}>Empty tree — insert a value to begin.</p>
      )}

      <svg
        className={styles.svg}
        viewBox={`0 0 ${Math.max(layout.width, 320)} ${Math.max(height, 120)}`}
        width={Math.max(layout.width, 320)}
        height={Math.max(height, 120)}
        role="img"
        aria-label="Tree diagram"
      >
        {/* Edges first so nodes paint over them. */}
        {Object.entries(state.nodes).map(([id, node]) =>
          (['leftId', 'rightId'] as const).map((key) => {
            const childId = node[key];
            const from = layout.positions[id];
            const to = childId ? layout.positions[childId] : undefined;
            if (!from || !to) return null;
            return (
              <line
                key={`${id}-${key}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={styles.edge}
              />
            );
          }),
        )}

        {Object.entries(layout.positions).map(([id, pos]) => (
          <g key={id} className={classFor(id)}>
            <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS} />
            <text x={pos.x} y={pos.y + 4} textAnchor="middle">
              {state.nodes[id].value}
            </text>
          </g>
        ))}

        {/* A rotation detaches a subtree for a step or two — show it rather than
            letting nodes blink out of existence. */}
        {layout.detached.map((id, i) => (
          <g key={id} className={`${classFor(id)} ${styles.detached}`}>
            <circle cx={i * X_SPACING + NODE_RADIUS + 8} cy={detachedY} r={NODE_RADIUS} />
            <text x={i * X_SPACING + NODE_RADIUS + 8} y={detachedY + 4} textAnchor="middle">
              {state.nodes[id].value}
            </text>
          </g>
        ))}

        {layout.detached.length > 0 && (
          <text x={4} y={detachedY - 22} className={styles.detachedLabel}>
            detached mid-rotation
          </text>
        )}
      </svg>
    </div>
  );
}
