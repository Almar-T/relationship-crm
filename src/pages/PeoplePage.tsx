import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PersonCard } from '../components/people/PersonCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { usePeople } from '../hooks/usePeople';
import { getDueInfo } from '../services/contactScheduler';
import type { Person } from '../types/person';
import styles from './PeoplePage.module.css';

type SortKey = 'due' | 'name' | 'strength';

export function PeoplePage() {
  const navigate = useNavigate();
  const { data, loading } = usePeople();
  const [sort, setSort] = useState<SortKey>('due');

  const sorted = useMemo(() => sortPeople(data ?? [], sort), [data, sort]);
  const count = data?.length ?? 0;

  return (
    <>
      <Header title="People" subtitle={count ? `${count} contacts` : undefined} large />

      {loading && !data ? (
        <Spinner />
      ) : count === 0 ? (
        <EmptyState
          icon="👋"
          title="No contacts yet"
          description="Add the friends, mentors and connections you want to stay close to."
          action={
            <Button size="lg" onClick={() => navigate('/add')}>
              Add your first contact
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.sortBar}>
            <Segmented
              options={[
                { value: 'due', label: 'By due' },
                { value: 'name', label: 'A–Z' },
                { value: 'strength', label: 'Strength' },
              ]}
              value={sort}
              onChange={setSort}
            />
          </div>

          <div className={styles.list}>
            {sorted.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function sortPeople(people: Person[], sort: SortKey): Person[] {
  const copy = [...people];
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'strength':
      return copy.sort((a, b) => b.relationshipStrength - a.relationshipStrength || a.name.localeCompare(b.name));
    case 'due':
    default:
      return copy.sort((a, b) => getDueInfo(a).days - getDueInfo(b).days || cmpName(a, b));
  }
}

function cmpName(a: Person, b: Person): number {
  return a.name.localeCompare(b.name);
}
