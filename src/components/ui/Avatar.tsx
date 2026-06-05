import styles from './Avatar.module.css';

/** Deterministic colored initials avatar. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = getInitials(name);
  const hue = hashHue(name);
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `hsl(${hue} 70% 88%)`,
        color: `hsl(${hue} 65% 32%)`,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}
