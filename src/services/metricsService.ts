/**
 * Relationship intelligence metrics. Derived purely from the contact records.
 */
import { personRepository } from '../repositories/personRepository';
import { getDueInfo } from './contactScheduler';
import { diffInDays, todayISO } from '../lib/date';

export interface Metrics {
  totalContacts: number;
  overdueContacts: number;
  dueThisWeek: number;
  recentlyContacted: number;
  neverContacted: number;
  /** 0–100 health score: share of contacts that are NOT overdue. */
  networkHealth: number;
  /** Tag → count, sorted desc. */
  topTags: Array<{ tag: string; count: number }>;
  /** Average relationship strength across the network (0 when empty). */
  averageStrength: number;
}

const RECENT_WINDOW_DAYS = 14;
const WEEK_DAYS = 7;

export const metricsService = {
  async load(reference: string = todayISO()): Promise<Metrics> {
    const people = await personRepository.getAll();
    const total = people.length;

    let overdue = 0;
    let dueThisWeek = 0;
    let recentlyContacted = 0;
    let neverContacted = 0;
    let strengthSum = 0;
    const tagCounts = new Map<string, number>();

    for (const person of people) {
      const info = getDueInfo(person, reference);
      if (info.status === 'overdue') overdue += 1;
      if (info.status === 'overdue' || info.status === 'due-today') dueThisWeek += 1;
      else if (info.status === 'due-soon' && info.days <= WEEK_DAYS) dueThisWeek += 1;

      if (!person.lastContactDate) {
        neverContacted += 1;
      } else if (Math.abs(diffInDays(reference, person.lastContactDate)) <= RECENT_WINDOW_DAYS) {
        recentlyContacted += 1;
      }

      strengthSum += person.relationshipStrength;
      for (const tag of person.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const topTags = [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalContacts: total,
      overdueContacts: overdue,
      dueThisWeek,
      recentlyContacted,
      neverContacted,
      networkHealth: total === 0 ? 100 : Math.round(((total - overdue) / total) * 100),
      topTags,
      averageStrength: total === 0 ? 0 : Math.round((strengthSum / total) * 10) / 10,
    };
  },
};
