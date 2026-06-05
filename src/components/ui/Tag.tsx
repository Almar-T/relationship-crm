import type { HTMLAttributes } from 'react';
import styles from './Tag.module.css';

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent';
}

export function Tag({ tone = 'neutral', className, children, ...rest }: TagProps) {
  return (
    <span className={[styles.tag, styles[tone], className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {children}
    </span>
  );
}
