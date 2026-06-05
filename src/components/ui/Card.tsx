import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  inset?: boolean;
}

export function Card({ interactive, inset, className, children, ...rest }: CardProps) {
  const classes = [
    styles.card,
    interactive ? styles.interactive : '',
    inset ? styles.inset : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
