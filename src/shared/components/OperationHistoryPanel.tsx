import styles from './OperationHistoryPanel.module.css';

export interface HistoryEntry {
  key: number;
  label: string;
  readOnly: boolean;
}

interface OperationHistoryPanelProps {
  history: HistoryEntry[];
  /** The operation currently mid-flight, if any. */
  activeLabel?: string | null;
  onUndo(): void;
  canUndo: boolean;
}

export function OperationHistoryPanel({
  history,
  activeLabel,
  onUndo,
  canUndo,
}: OperationHistoryPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>History</span>
        <button onClick={onUndo} disabled={!canUndo}>
          Undo last
        </button>
      </div>

      <ol className={styles.list}>
        {history.length === 0 && !activeLabel && (
          <li className={styles.empty}>No operations yet.</li>
        )}
        {history.map((entry) => (
          <li key={entry.key} className={entry.readOnly ? styles.readOnly : undefined}>
            {entry.label}
            {entry.readOnly && <span className={styles.tag}>read</span>}
          </li>
        ))}
        {activeLabel && (
          <li className={styles.active}>
            {activeLabel}
            <span className={styles.tag}>running</span>
          </li>
        )}
      </ol>
    </div>
  );
}
