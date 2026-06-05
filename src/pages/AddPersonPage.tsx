import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PersonForm } from '../components/people/PersonForm';
import { usePeople } from '../hooks/usePeople';
import { personService } from '../services/personService';
import { collectTags } from '../lib/tags';
import type { PersonInput } from '../types/person';

export function AddPersonPage() {
  const navigate = useNavigate();
  const { data: people } = usePeople();

  async function handleSubmit(input: PersonInput) {
    const created = await personService.create(input);
    navigate(`/person/${created.id}`, { replace: true });
  }

  return (
    <>
      <Header title="New contact" back />
      <PersonForm submitLabel="Add contact" tagSuggestions={collectTags(people ?? [])} onSubmit={handleSubmit} />
    </>
  );
}
