import type { RelationshipStrength } from '../../types/person';
import { RELATIONSHIP_STRENGTH_LABELS } from '../../types/person';
import styles from './StrengthMeter.module.css';

interface StrengthMeterProps {
  value: RelationshipStrength;
  showLabel?: boolean;
}

export function StrengthMeter({ value, showLabel }: StrengthMeterProps) {
  return (
    <span className={styles.wrap} title={RELATIONSHIP_STRENGTH_LABELS[value]}>
      <span className={styles.dots} aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`${styles.dot} ${i <= value ? styles.filled : ''}`} />
        ))}
      </span>
      {showLabel && <span className={styles.label}>{RELATIONSHIP_STRENGTH_LABELS[value]}</span>}
    </span>
  );
}
