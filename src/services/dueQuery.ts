/**
 * Shared "who is due" logic. Imported by BOTH the React dashboard and the
 * service worker's push handler, so the daily notification count is computed
 * the exact same way the UI shows it — and entirely on-device. The Cloudflare
 * Worker never sees any contact data; it only sends a content-free "wake up"
 * push and the service worker fills in the real number locally.
 */
import { getAllPeople } from '../db/database';
import { getDueInfo, isActionable } from './contactScheduler';
import { todayISO } from '../lib/date';
import type { Person } from '../types/person';

export interface DueBuckets {
  overdue: Person[];
  dueToday: Person[];
  dueSoon: Person[];
}

/** Group every contact into overdue / due-today / due-soon buckets. */
export async function getDueBuckets(reference: string = todayISO()): Promise<DueBuckets> {
  const people = await getAllPeople();
  const buckets: DueBuckets = { overdue: [], dueToday: [], dueSoon: [] };

  for (const person of people) {
    const { status } = getDueInfo(person, reference);
    if (status === 'overdue') buckets.overdue.push(person);
    else if (status === 'due-today') buckets.dueToday.push(person);
    else if (status === 'due-soon') buckets.dueSoon.push(person);
  }

  // Most-overdue first, then strongest relationships first.
  buckets.overdue.sort((a, b) => byDue(a, b, reference) || byStrength(a, b));
  buckets.dueToday.sort(byStrength);
  buckets.dueSoon.sort((a, b) => byDue(a, b, reference) || byStrength(a, b));

  return buckets;
}

/** The number the daily notification announces: overdue + due today. */
export async function countActionable(reference: string = todayISO()): Promise<number> {
  const people = await getAllPeople();
  return people.filter((p) => isActionable(getDueInfo(p, reference))).length;
}

function byDue(a: Person, b: Person, reference: string): number {
  return getDueInfo(a, reference).days - getDueInfo(b, reference).days;
}

function byStrength(a: Person, b: Person): number {
  return b.relationshipStrength - a.relationshipStrength;
}
