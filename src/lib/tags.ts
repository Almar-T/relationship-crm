import type { Person } from '../types/person';

/** Unique tags across all contacts, most-used first — powers form suggestions. */
export function collectTags(people: Person[]): string[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const person of people) {
    for (const tag of person.tags) {
      const key = tag.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).map((e) => e.tag);
}
