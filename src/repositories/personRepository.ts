/**
 * Repository layer: the ONLY place that knows how Person records are persisted.
 * Services depend on this interface, not on IndexedDB directly, so the storage
 * engine (IndexedDB today, maybe Supabase in V2) can be swapped without
 * touching business logic.
 */
import {
  getAllPeople,
  promisifyRequest,
  withStore,
} from '../db/database';
import type { Person } from '../types/person';

export const personRepository = {
  async getAll(): Promise<Person[]> {
    return getAllPeople();
  },

  async getById(id: string): Promise<Person | undefined> {
    return withStore('readonly', (store) =>
      promisifyRequest(store.get(id) as IDBRequest<Person | undefined>),
    );
  },

  async create(person: Person): Promise<Person> {
    await withStore('readwrite', (store) => promisifyRequest(store.add(person)));
    return person;
  },

  async update(person: Person): Promise<Person> {
    await withStore('readwrite', (store) => promisifyRequest(store.put(person)));
    return person;
  },

  async delete(id: string): Promise<void> {
    await withStore('readwrite', (store) => promisifyRequest(store.delete(id)));
  },

  /** Bulk replace — used by backup/restore. Clears then re-seeds the store. */
  async replaceAll(people: Person[]): Promise<void> {
    await withStore('readwrite', async (store) => {
      await promisifyRequest(store.clear());
      for (const person of people) {
        await promisifyRequest(store.put(person));
      }
    });
  },

  async count(): Promise<number> {
    return withStore('readonly', (store) => promisifyRequest(store.count()));
  },
};

export type PersonRepository = typeof personRepository;
