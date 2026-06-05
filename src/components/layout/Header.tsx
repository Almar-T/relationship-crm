import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Show an iOS-style back chevron. */
  back?: boolean;
  /** Element rendered on the right (e.g. an Edit button). */
  trailing?: ReactNode;
  large?: boolean;
}

export function Header({ title, subtitle, back, trailing, large }: HeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <div className={styles.side}>
          {back && (
            <button className={styles.back} onClick={() => navigate(-1)} aria-label="Back">
              <span aria-hidden>‹</span> Back
            </button>
          )}
        </div>
        {!large && <h1 className={styles.compactTitle}>{title}</h1>}
        <div className={`${styles.side} ${styles.trailing}`}>{trailing}</div>
      </div>
      {large && (
        <div className={styles.largeTitle}>
          <h1>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}
    </header>
  );
}
