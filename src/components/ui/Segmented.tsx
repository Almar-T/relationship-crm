import styles from './Segmented.module.css';

interface Option<T> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Wrap onto multiple rows instead of a single scrolling track. */
  wrap?: boolean;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  wrap,
}: SegmentedProps<T>) {
  return (
    <div className={[styles.track, wrap ? styles.wrap : ''].filter(Boolean).join(' ')} role="radiogroup">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={`${styles.segment} ${option.value === value ? styles.active : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
