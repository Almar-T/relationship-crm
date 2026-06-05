import type { ReactNode } from 'react';
import styles from './Section.module.css';

interface SectionProps {
  title: string;
  count?: number;
  accent?: 'red' | 'orange' | 'accent' | 'neutral';
  children: ReactNode;
}

export function Section({ title, count, accent = 'neutral', children }: SectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {count !== undefined && <span className={`${styles.count} ${styles[accent]}`}>{count}</span>}
      </div>
      <div className={styles.list}>{children}</div>
    </section>
  );
}
