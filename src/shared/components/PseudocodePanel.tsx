import styles from './PseudocodePanel.module.css';

interface PseudocodePanelProps {
  lines: string[];
  /** Index of the line the current step is executing, if any. */
  activeLine?: number;
  title?: string;
}

export function PseudocodePanel({ lines, activeLine, title = 'Pseudocode' }: PseudocodePanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>{title}</div>
      <ol className={styles.code}>
        {lines.map((line, index) => (
          <li
            key={index}
            className={index === activeLine ? styles.active : undefined}
            // Leading spaces in the pseudocode carry the indentation.
            style={{ whiteSpace: 'pre' }}
          >
            {line}
          </li>
        ))}
      </ol>
    </div>
  );
}
