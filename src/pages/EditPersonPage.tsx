import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PersonForm } from '../components/people/PersonForm';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { usePeople, usePerson } from '../hooks/usePeople';
import { personService } from '../services/personService';
import { collectTags } from '../lib/tags';
import type { PersonInput } from '../types/person';

export function EditPersonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: person, loading } = usePerson(id);
  const { data: people } = usePeople();

  if (loading) return <Spinner />;
  if (!person) {
    return (
      <>
        <Header title="" back />
        <EmptyState icon="🔍" title="Contact not found" />
      </>
    );
  }

  async function handleSubmit(input: PersonInput) {
    await personService.update(person!.id, input);
    navigate(`/person/${person!.id}`, { replace: true });
  }

  return (
    <>
      <Header title="Edit contact" back />
      <PersonForm
        initial={person}
        submitLabel="Save changes"
        tagSuggestions={collectTags(people ?? [])}
        onSubmit={handleSubmit}
      />
    </>
  );
}
