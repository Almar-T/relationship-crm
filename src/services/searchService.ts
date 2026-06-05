/**
 * Fast in-memory search across name, notes, tags, company and where-met.
 * The dataset is a personal network (hundreds, not millions), so loading all
 * records and filtering in memory is both simplest and fastest.
 */
import { personRepository } from '../repositories/personRepository';
import type { Person } from '../types/person';

export interface SearchResult {
  person: Person;
  /** Which field(s) matched — drives the "matched in Notes" hint in the UI. */
  matchedFields: string[];
}

const FIELD_GETTERS: Array<{ label: string; get: (p: Person) => string }> = [
  { label: 'Name', get: (p) => p.name },
  { label: 'Company', get: (p) => p.company ?? '' },
  { label: 'Role', get: (p) => p.role ?? '' },
  { label: 'Where met', get: (p) => p.whereMet ?? '' },
  { label: 'Notes', get: (p) => p.notes ?? '' },
  { label: 'Tags', get: (p) => p.tags.join(' ') },
];

export const searchService = {
  async search(query: string): Promise<SearchResult[]> {
    const q = query.trim().toLowerCase();
    const people = await personRepository.getAll();
    if (!q) {
      return people
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((person) => ({ person, matchedFields: [] }));
    }

    const terms = q.split(/\s+/).filter(Boolean);
    const results: SearchResult[] = [];

    for (const person of people) {
      const matchedFields = new Set<string>();
      // Every term must match at least one field (AND across terms).
      const allTermsMatch = terms.every((term) =>
        FIELD_GETTERS.some(({ label, get }) => {
          if (get(person).toLowerCase().includes(term)) {
            matchedFields.add(label);
            return true;
          }
          return false;
        }),
      );
      if (allTermsMatch) {
        results.push({ person, matchedFields: [...matchedFields] });
      }
    }

    // Name matches rank above body matches.
    return results.sort((a, b) => {
      const an = a.matchedFields.includes('Name') ? 0 : 1;
      const bn = b.matchedFields.includes('Name') ? 0 : 1;
      return an - bn || a.person.name.localeCompare(b.person.name);
    });
  },
};
