/**
 * Day-granularity date helpers. Everything works on local `YYYY-MM-DD`
 * strings so scheduling is timezone-stable: "due today" means today on the
 * device, regardless of UTC offset.
 *
 * This module is intentionally framework- and DOM-free so it can be imported
 * by both the React app and the service worker.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Local `YYYY-MM-DD` for the given Date (defaults to now). */
export function toISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today as a local `YYYY-MM-DD` string. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse a `YYYY-MM-DD` string to a local Date at midnight. */
export function parseISODate(iso: string): Date {
  if (!ISO_DATE.test(iso)) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Add `days` (may be negative) to an ISO date, returning a new ISO date. */
export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Whole-day difference `a - b`. Positive when `a` is later than `b`. */
export function diffInDays(a: string, b: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const da = parseISODate(a).getTime();
  const db = parseISODate(b).getTime();
  return Math.round((da - db) / MS_PER_DAY);
}

/** Full ISO timestamp (for createdDate and the like). */
export function nowTimestamp(): string {
  return new Date().toISOString();
}

/** "Jun 5, 2026" style formatting for display. */
export function formatHumanDate(iso: string | null): string {
  if (!iso) return '—';
  const date = ISO_DATE.test(iso) ? parseISODate(iso) : new Date(iso);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** "in 2 days", "today", "5 days ago" relative to today. */
export function relativeDayLabel(iso: string): string {
  const delta = diffInDays(iso, todayISO());
  if (delta === 0) return 'today';
  if (delta === 1) return 'tomorrow';
  if (delta === -1) return 'yesterday';
  if (delta > 0) return `in ${delta} days`;
  return `${Math.abs(delta)} days ago`;
}
