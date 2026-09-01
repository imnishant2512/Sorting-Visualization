import styles from './PlaybackControls.module.css';

export interface PlaybackControlsProps {
  isPlaying: boolean;
  canStepBack: boolean;
  canStepForward: boolean;
  cursor: number;
  totalSteps: number;
  speedMs: number;
  onToggle(): void;
  onStepBack(): void;
  onStepForward(): void;
  onReset(): void;
  onSpeedChange(ms: number): void;
  onSeek?(cursor: number): void;
  /** Why scrubbing is unavailable, shown on the disabled slider. */
  seekDisabledReason?: string;
  /** Label for the reset button — "New Array" in batch mode, "Cancel" mid-operation. */
  resetLabel?: string;
}

function formatDuration(ms: number): string {
  if (ms < 950) return `${Math.max(1, Math.round(ms / 100) / 10)}s`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
}

/**
 * The single control surface for both batch runs and an interactive domain's
 * active operation — identical props either way, which is what keeps the two
 * modes honestly sharing one engine.
 */
export function PlaybackControls({
  isPlaying,
  canStepBack,
  canStepForward,
  cursor,
  totalSteps,
  speedMs,
  onToggle,
  onStepBack,
  onStepForward,
  onReset,
  onSpeedChange,
  onSeek,
  seekDisabledReason,
  resetLabel = 'Reset',
}: PlaybackControlsProps) {
  const remaining = Math.max(0, totalSteps - 1 - cursor);
  const estimate = remaining * speedMs;

  return (
    <div className={styles.bar}>
      <div className={styles.buttons}>
        <button onClick={onStepBack} disabled={!canStepBack} title="Step back one operation (←)">
          ‹ Step
        </button>
        <button
          className={styles.primary}
          onClick={onToggle}
          disabled={!canStepForward && !isPlaying}
          title="Play or pause (Space)"
        >
          {isPlaying ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button
          onClick={onStepForward}
          disabled={!canStepForward}
          title="Step forward one operation (→)"
        >
          Step ›
        </button>
        <button onClick={onReset}>{resetLabel}</button>
      </div>

      <label className={styles.scrub} title={!onSeek ? seekDisabledReason : undefined}>
        <input
          type="range"
          min={-1}
          max={Math.max(0, totalSteps - 1)}
          value={cursor}
          disabled={!onSeek || totalSteps === 0}
          onChange={(e) => onSeek?.(Number(e.target.value))}
        />
        <span className={styles.counter}>
          {cursor + 1} / {totalSteps}
          {remaining > 0 && <em className={styles.estimate}>≈{formatDuration(estimate)} left</em>}
        </span>
      </label>

      <label className={styles.speed}>
        Speed
        {/* Inverted: dragging right lowers the delay. Applies live, mid-run. */}
        <input
          type="range"
          min={1}
          max={300}
          step={1}
          value={301 - speedMs}
          onChange={(e) => onSpeedChange(301 - Number(e.target.value))}
        />
      </label>

      <span className={styles.keys} aria-hidden>
        Space · ← →
      </span>
    </div>
  );
}
