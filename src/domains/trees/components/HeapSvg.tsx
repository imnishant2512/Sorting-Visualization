import { NODE_RADIUS, layoutHeap, parentOfIndex } from '../layout';
import type { HeapState, HeapStep } from '../types';
import styles from './TreeSvg.module.css';

interface HeapSvgProps {
  state: HeapState;
  currentStep: HeapStep | null;
}

const WIDTH = 760;

/** A heap is stored as an array; this draws the complete tree that array implies. */
export function HeapSvg({ state, currentStep }: HeapSvgProps) {
  const layout = layoutHeap(state.items.length, WIDTH);

  const touched = new Set<number>();
  if (currentStep?.kind === 'compare') {
    touched.add(currentStep.a);
    touched.add(currentStep.b);
  }
  const swapping = new Set<number>();
  if (currentStep?.kind === 'swap') {
    swapping.add(currentStep.a);
    swapping.add(currentStep.b);
  }

  const classFor = (index: number) => {
    if (swapping.has(index)) return styles.found;
    if (touched.has(index)) return styles.comparing;
    if (state.pointer === index) return styles.pointer;
    return styles.node;
  };

  return (
    <div className={styles.wrap}>
      {state.items.length === 0 && <p className={styles.empty}>Empty heap — insert a value.</p>}

      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${Math.max(layout.height, 120)}`}
        width={WIDTH}
        height={Math.max(layout.height, 120)}
        role="img"
        aria-label="Heap diagram"
      >
        {layout.positions.map((pos, index) => {
          if (index === 0) return null;
          const parent = layout.positions[parentOfIndex(index)];
          return (
            <line
              key={`e${index}`}
              x1={parent.x}
              y1={parent.y}
              x2={pos.x}
              y2={pos.y}
              className={styles.edge}
            />
          );
        })}

        {layout.positions.map((pos, index) => (
          <g key={index} className={classFor(index)}>
            <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS} />
            <text x={pos.x} y={pos.y + 4} textAnchor="middle">
              {state.items[index]}
            </text>
          </g>
        ))}
      </svg>

      <div className={styles.arrayStrip}>
        {state.items.map((value, index) => (
          <span key={index} className={swapping.has(index) || touched.has(index) ? styles.cellHot : styles.cell}>
            <em>{index}</em>
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
