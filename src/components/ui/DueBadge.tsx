import type { DueInfo } from '../../services/contactScheduler';
import { dueLabel } from '../../services/contactScheduler';
import styles from './DueBadge.module.css';

export function DueBadge({ info }: { info: DueInfo }) {
  return (
    <span className={[styles.badge, styles[toClass(info.status)]].join(' ')}>
      <span className={styles.dot} aria-hidden />
      {dueLabel(info)}
    </span>
  );
}

function toClass(status: DueInfo['status']): 'overdue' | 'today' | 'soon' | 'upcoming' {
  if (status === 'due-today') return 'today';
  if (status === 'due-soon') return 'soon';
  if (status === 'overdue') return 'overdue';
  return 'upcoming';
}
