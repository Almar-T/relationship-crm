import { personService } from '../services/personService';
import { searchService, type SearchResult } from '../services/searchService';
import type { Person } from '../types/person';
import { useAsyncData } from './useAsyncData';

export function usePeople() {
  return useAsyncData<Person[]>(() => personService.list());
}

export function usePerson(id: string | undefined) {
  return useAsyncData<Person | undefined>(() => (id ? personService.get(id) : Promise.resolve(undefined)), [id]);
}

export function useSearch(query: string) {
  return useAsyncData<SearchResult[]>(() => searchService.search(query), [query]);
}
