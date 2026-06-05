/**
 * Dashboard service: composes the primary screen's data from the due buckets.
 */
import { getDueBuckets, type DueBuckets } from './dueQuery';
import { todayISO } from '../lib/date';

export interface DashboardData extends DueBuckets {
  /** overdue + due today — the count the user must act on. */
  actionableCount: number;
  reference: string;
}

export const dashboardService = {
  async load(reference: string = todayISO()): Promise<DashboardData> {
    const buckets = await getDueBuckets(reference);
    return {
      ...buckets,
      actionableCount: buckets.overdue.length + buckets.dueToday.length,
      reference,
    };
  },
};
