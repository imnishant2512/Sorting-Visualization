import { listOrder } from '../engine';
import type { ListState, ListStep } from '../types';
import styles from './ListView.module.css';

interface ListViewProps {
  state: ListState;
  currentStep: ListStep | null;
}

export function ListView({ state, currentStep }: ListViewProps) {
  const order = listOrder(state);
  const touched = currentStep && 'id' in currentStep ? currentStep.id : null;

  const nodeClass = (id: string) => {
    const classes = [styles.node];
    if (state.foundId === id) classes.push(styles.found);
    else if (touched === id && currentStep?.kind === 'compare') classes.push(styles.compare);
    else if (touched === id && currentStep?.kind === 'createNode') classes.push(styles.created);
    else if (state.pointer === id) classes.push(styles.pointer);
    return classes.join(' ');
  };

  return (
    <div className={styles.view}>
      {order.length === 0 && <p className={styles.empty}>Empty list — head points at null.</p>}

      {order.length > 0 && (
        <div className={styles.chain}>
          <span className={styles.head}>head</span>
          <span className={styles.arrow}>→</span>
          {order.map((id) => (
            <span key={id} className={styles.link}>
              <span className={nodeClass(id)}>
                <span className={styles.value}>{state.nodes[id].value}</span>
                <span className={styles.next} />
              </span>
              <span className={styles.arrow}>→</span>
            </span>
          ))}
          <span className={styles.null}>null</span>
        </div>
      )}
    </div>
  );
}
