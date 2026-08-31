import { memo, useCallback } from 'react';
import type { GridState } from '../types';
import styles from './Grid.module.css';

export type CellRole =
  | 'start'
  | 'end'
  | 'wall'
  | 'weight'
  | 'path'
  | 'scanning'
  | 'visited'
  | 'frontier'
  | 'empty';

interface CellProps {
  index: number;
  role: CellRole;
  weight: number;
  onDown(index: number): void;
  onEnter(index: number): void;
}

/**
 * Memoized per cell: a run repaints a handful of cells per step, and without
 * this every step would re-render all ~800 of them.
 */
const Cell = memo(function Cell({ index, role, weight, onDown, onEnter }: CellProps) {
  return (
    <div
      className={`${styles.cell} ${styles[role]}`}
      onMouseDown={(e) => {
        e.preventDefault();
        onDown(index);
      }}
      onMouseEnter={() => onEnter(index)}
      role="presentation"
    >
      {role === 'weight' && <span className={styles.weightMark}>{weight}</span>}
      {role === 'start' && <span className={styles.marker}>▶</span>}
      {role === 'end' && <span className={styles.marker}>◎</span>}
    </div>
  );
});

interface GridProps {
  state: GridState;
  onCellDown(index: number): void;
  onCellEnter(index: number): void;
  onRelease(): void;
}

export function Grid({ state, onCellDown, onCellEnter, onRelease }: GridProps) {
  const roleFor = useCallback(
    (index: number): CellRole => {
      if (index === state.start) return 'start';
      if (index === state.end) return 'end';
      if (state.walls[index]) return 'wall';
      if (state.path[index]) return 'path';
      if (state.scanning === index) return 'scanning';
      if (state.visited[index]) return 'visited';
      if (state.frontier[index]) return 'frontier';
      if (state.weights[index] > 1) return 'weight';
      return 'empty';
    },
    [state],
  );

  return (
    <div
      className={styles.grid}
      style={{ gridTemplateColumns: `repeat(${state.cols}, 1fr)` }}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
    >
      {state.walls.map((_, index) => (
        <Cell
          key={index}
          index={index}
          role={roleFor(index)}
          weight={state.weights[index]}
          onDown={onCellDown}
          onEnter={onCellEnter}
        />
      ))}
    </div>
  );
}
