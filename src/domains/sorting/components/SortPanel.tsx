import type { Frame } from '../../../engine/types';
import { BarChart, type BarState } from '../../../shared/components/BarChart';
import { PseudocodePanel } from '../../../shared/components/PseudocodePanel';
import { StatsPanel } from '../../../shared/components/StatsPanel';
import { SORT_GROUPS } from '../registry';
import { highlightsForStep, type SortAlgorithm, type SortState, type SortStep } from '../types';
import styles from './SortPanel.module.css';

const STAT_LABELS = [
  { key: 'comparisons', label: 'Comparisons' },
  { key: 'swaps', label: 'Swaps' },
  { key: 'accesses', label: 'Accesses' },
];

interface SortPanelProps {
  def: SortAlgorithm;
  frame: Frame<SortState>;
  currentStep: SortStep | null;
  maxValue: number;
  onAlgorithmChange(id: string): void;
  /** Race mode renders two of these side by side, so panels get denser. */
  compact?: boolean;
  finished?: boolean;
}

export function SortPanel({
  def,
  frame,
  currentStep,
  maxValue,
  onAlgorithmChange,
  compact = false,
  finished = false,
}: SortPanelProps) {
  const highlights = highlightsForStep(currentStep);
  const { sorted } = frame.state;

  const stateFor = (index: number): BarState => {
    const highlight = highlights.get(index);
    if (highlight) return highlight;
    if (sorted[index]) return 'sorted';
    return 'idle';
  };

  return (
    <section className={`${styles.panel} ${compact ? styles.compact : ''}`}>
      <header className={styles.header}>
        <select value={def.id} onChange={(e) => onAlgorithmChange(e.target.value)}>
          {SORT_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.algorithms.map((algorithm) => (
                <option key={algorithm.id} value={algorithm.id}>
                  {algorithm.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {finished && <span className={styles.done}>Done</span>}
      </header>

      <p className={styles.summary}>{def.summary}</p>

      {/* Chart and pseudocode sit side by side so the highlighted line is
          visible while the bars are moving — stacked, the panel falls below
          the fold and the sync is wasted. */}
      <div className={styles.workspace}>
        <div className={styles.chart}>
          <BarChart
            values={frame.state.values}
            maxValue={maxValue}
            stateFor={stateFor}
            range={frame.state.range}
            showValues={!compact}
          />
        </div>

        <div className={styles.readouts}>
          <StatsPanel
            stats={frame.stats}
            labels={STAT_LABELS}
            complexity={def.complexity}
            note={frame.state.note}
          />
          <PseudocodePanel lines={def.pseudocode} activeLine={frame.currentLine} />
        </div>
      </div>
    </section>
  );
}
