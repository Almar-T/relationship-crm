/**
 * Pure scheduling logic — the heart of the product. No IndexedDB, no React.
 * Given a contact's frequency and last-contact date, it knows when the next
 * touch is due and how overdue/soon any contact is. Trivially unit-testable.
 */
import { addDays, diffInDays, todayISO } from '../lib/date';
import type { Person } from '../types/person';

export interface FrequencyOption {
  days: number;
  label: string;
}

/** The preset cadences offered in the UI. "Custom" is handled separately. */
export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { days: 30, label: 'Every 30 days' },
  { days: 60, label: 'Every 60 days' },
  { days: 90, label: 'Every 90 days' },
  { days: 180, label: 'Every 6 months' },
  { days: 365, label: 'Every year' },
];

export type DueStatus = 'overdue' | 'due-today' | 'due-soon' | 'upcoming';

export const DUE_SOON_WINDOW_DAYS = 7;

/**
 * The next time you should reach out: `from` + frequency. `from` defaults to
 * today (used right after logging a contact). When seeding a brand-new contact
 * you have never spoken to, pass today so they surface on the normal cadence.
 */
export function computeNextContactDate(
  frequencyDays: number,
  from: string = todayISO(),
): string {
  return addDays(from, frequencyDays);
}

export interface DueInfo {
  status: DueStatus;
  /** Signed day delta of nextContactDate relative to today (neg = overdue). */
  days: number;
}

/** Classify a contact's due state relative to a reference day (default today). */
export function getDueInfo(person: Person, reference: string = todayISO()): DueInfo {
  const days = diffInDays(person.nextContactDate, reference);
  let status: DueStatus;
  if (days < 0) status = 'overdue';
  else if (days === 0) status = 'due-today';
  else if (days <= DUE_SOON_WINDOW_DAYS) status = 'due-soon';
  else status = 'upcoming';
  return { status, days };
}

/** Human-friendly due label, e.g. "5 days overdue", "Due today", "Due in 3 days". */
export function dueLabel(info: DueInfo): string {
  switch (info.status) {
    case 'overdue': {
      const n = Math.abs(info.days);
      return n === 1 ? '1 day overdue' : `${n} days overdue`;
    }
    case 'due-today':
      return 'Due today';
    case 'due-soon':
      return info.days === 1 ? 'Due tomorrow' : `Due in ${info.days} days`;
    case 'upcoming':
      return `Due in ${info.days} days`;
  }
}

/** True when a contact needs attention now (overdue or due today). */
export function isActionable(info: DueInfo): boolean {
  return info.status === 'overdue' || info.status === 'due-today';
}
