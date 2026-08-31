import type { StatCounters } from '../../engine/types';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  stats: StatCounters;
  /** Ordered keys to display, with human labels. */
  labels: Array<{ key: string; label: string }>;
  complexity?: { time: string; space: string };
  note?: string | null;
}

export function StatsPanel({ stats, labels, complexity, note }: StatsPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.counters}>
        {labels.map(({ key, label }) => (
          <div key={key} className={styles.counter}>
            <span className={styles.value}>{(stats[key] ?? 0).toLocaleString()}</span>
            <span className={styles.label}>{label}</span>
          </div>
        ))}
      </div>

      {complexity && (
        <dl className={styles.complexity}>
          <dt>Time</dt>
          <dd>{complexity.time}</dd>
          <dt>Space</dt>
          <dd>{complexity.space}</dd>
        </dl>
      )}

      {note && <div className={styles.note}>{note}</div>}
    </div>
  );
}
