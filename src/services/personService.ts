/**
 * Person service: all create/update/contact business rules live here, never in
 * components. Components call these functions and re-render from the result.
 */
import { personRepository } from '../repositories/personRepository';
import { createId } from '../lib/id';
import { nowTimestamp, todayISO } from '../lib/date';
import { emitDataChanged } from '../lib/events';
import { computeNextContactDate } from './contactScheduler';
import type { Person, PersonInput } from '../types/person';

export const personService = {
  async list(): Promise<Person[]> {
    return personRepository.getAll();
  },

  async get(id: string): Promise<Person | undefined> {
    return personRepository.getById(id);
  },

  /**
   * Create a contact. We seed `nextContactDate` from today using the chosen
   * frequency, so a brand-new contact you have not spoken to yet enters the
   * cadence immediately and surfaces when due.
   */
  async create(input: PersonInput): Promise<Person> {
    const today = todayISO();
    const person: Person = {
      id: createId(),
      ...normalizeInput(input),
      createdDate: nowTimestamp(),
      lastContactDate: null,
      nextContactDate: computeNextContactDate(input.contactFrequencyDays, today),
    };
    const created = await personRepository.create(person);
    emitDataChanged();
    return created;
  },

  /**
   * Edit a contact. Changing the frequency re-bases the next-contact date off
   * the last contact (or today if never contacted) so the new cadence applies
   * immediately without the user touching any reminders.
   */
  async update(id: string, input: PersonInput): Promise<Person> {
    const existing = await personRepository.getById(id);
    if (!existing) throw new Error(`Person ${id} not found`);

    const frequencyChanged = existing.contactFrequencyDays !== input.contactFrequencyDays;
    const base = existing.lastContactDate ?? todayISO();

    const updated: Person = {
      ...existing,
      ...normalizeInput(input),
      nextContactDate: frequencyChanged
        ? computeNextContactDate(input.contactFrequencyDays, base)
        : existing.nextContactDate,
    };
    const saved = await personRepository.update(updated);
    emitDataChanged();
    return saved;
  },

  /**
   * The core action. "Contacted today" → last = today, next = today + freq.
   * No manual scheduling, ever.
   */
  async markContactedToday(id: string): Promise<Person> {
    const existing = await personRepository.getById(id);
    if (!existing) throw new Error(`Person ${id} not found`);
    const today = todayISO();
    const updated: Person = {
      ...existing,
      lastContactDate: today,
      nextContactDate: computeNextContactDate(existing.contactFrequencyDays, today),
    };
    const saved = await personRepository.update(updated);
    emitDataChanged();
    return saved;
  },

  /** Log a contact on a specific past date (used by "Edit last contact"). */
  async setLastContactDate(id: string, date: string): Promise<Person> {
    const existing = await personRepository.getById(id);
    if (!existing) throw new Error(`Person ${id} not found`);
    const updated: Person = {
      ...existing,
      lastContactDate: date,
      nextContactDate: computeNextContactDate(existing.contactFrequencyDays, date),
    };
    const saved = await personRepository.update(updated);
    emitDataChanged();
    return saved;
  },

  async remove(id: string): Promise<void> {
    await personRepository.delete(id);
    emitDataChanged();
  },
};

/** Trim strings, drop empty optionals, and de-duplicate/clean tags. */
function normalizeInput(input: PersonInput) {
  return {
    name: input.name.trim(),
    company: clean(input.company),
    role: clean(input.role),
    whereMet: clean(input.whereMet),
    notes: input.notes?.trim() || undefined,
    tags: normalizeTags(input.tags),
    relationshipStrength: input.relationshipStrength,
    contactFrequencyDays: input.contactFrequencyDays,
  };
}

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}
