import type { HashState, HashStep } from '../types';
import styles from './BucketRows.module.css';

interface BucketRowsProps {
  state: HashState;
  currentStep: HashStep | null;
}

export function BucketRows({ state, currentStep }: BucketRowsProps) {
  const collided = new Set(state.collided);
  const placing = currentStep?.kind === 'place' ? currentStep.bucket : null;
  const removing = currentStep?.kind === 'remove' ? currentStep.bucket : null;

  const rowClass = (bucket: number) => {
    const classes = [styles.row];
    if (state.foundAt?.bucket === bucket) classes.push(styles.found);
    else if (placing === bucket || removing === bucket) classes.push(styles.writing);
    else if (state.cursor === bucket) classes.push(styles.cursor);
    else if (collided.has(bucket)) classes.push(styles.collided);
    return classes.join(' ');
  };

  return (
    <div className={styles.table}>
      {state.buckets.map((slots, bucket) => (
        <div key={bucket} className={rowClass(bucket)}>
          <span className={styles.index}>{bucket}</span>
          <div className={styles.chain}>
            {slots.length === 0 && <span className={styles.emptySlot}>empty</span>}
            {slots.map((slot, pos) => (
              <span
                key={pos}
                className={
                  slot.state === 'tombstone'
                    ? styles.tombstone
                    : state.foundAt?.bucket === bucket && state.foundAt.pos === pos
                      ? styles.hitSlot
                      : styles.slot
                }
                title={slot.state === 'tombstone' ? 'tombstone — probing must continue past it' : undefined}
              >
                {slot.state === 'tombstone' ? `✕ ${slot.key}` : slot.key}
              </span>
            ))}
            {collided.has(bucket) && <span className={styles.collisionTag}>collision</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
