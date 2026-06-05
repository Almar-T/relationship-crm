import { useMemo, useState } from 'react';
import { Field, TextInput, TextArea } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { TagInput } from '../ui/TagInput';
import { Button } from '../ui/Button';
import { FREQUENCY_OPTIONS } from '../../services/contactScheduler';
import { RELATIONSHIP_STRENGTH_LABELS } from '../../types/person';
import type { Person, PersonInput, RelationshipStrength } from '../../types/person';
import styles from './PersonForm.module.css';

interface PersonFormProps {
  initial?: Person;
  tagSuggestions?: string[];
  submitLabel: string;
  onSubmit: (input: PersonInput) => Promise<void>;
}

const PRESET_DAYS = FREQUENCY_OPTIONS.map((o) => o.days);

export function PersonForm({ initial, tagSuggestions = [], submitLabel, onSubmit }: PersonFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [whereMet, setWhereMet] = useState(initial?.whereMet ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [strength, setStrength] = useState<RelationshipStrength>(initial?.relationshipStrength ?? 3);

  const initialFreq = initial?.contactFrequencyDays ?? 90;
  const initialIsPreset = PRESET_DAYS.includes(initialFreq);
  const [frequency, setFrequency] = useState<number>(initialFreq);
  const [customMode, setCustomMode] = useState(!initialIsPreset);
  const [customDays, setCustomDays] = useState(String(initialFreq));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveFrequency = customMode ? Number(customDays) : frequency;
  const valid = name.trim().length > 0 && effectiveFrequency >= 1 && Number.isFinite(effectiveFrequency);

  const strengthOptions = useMemo(
    () =>
      (Object.keys(RELATIONSHIP_STRENGTH_LABELS) as unknown as string[]).map((k) => {
        const value = Number(k) as RelationshipStrength;
        return { value, label: String(value) };
      }),
    [],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name,
        company,
        role,
        whereMet,
        notes,
        tags,
        relationshipStrength: strength,
        contactFrequencyDays: Math.round(effectiveFrequency),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Field label="Name">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          autoFocus={!initial}
          autoCapitalize="words"
          enterKeyHint="next"
        />
      </Field>

      <div className={styles.row}>
        <Field label="Company">
          <TextInput value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme" />
        </Field>
        <Field label="Role">
          <TextInput value={role} onChange={(e) => setRole(e.target.value)} placeholder="Founder" />
        </Field>
      </div>

      <Field label="Where you met">
        <TextInput
          value={whereMet}
          onChange={(e) => setWhereMet(e.target.value)}
          placeholder="SaaStr 2026, intro from Alex…"
        />
      </Field>

      <Field label="Relationship strength" hint={RELATIONSHIP_STRENGTH_LABELS[strength]}>
        <Segmented options={strengthOptions} value={strength} onChange={setStrength} />
      </Field>

      <Field label="Stay in touch" hint="The app reschedules the next reach-out automatically.">
        <Segmented
          wrap
          options={[...FREQUENCY_OPTIONS.map((o) => ({ value: o.days, label: o.label })), { value: -1, label: 'Custom' }]}
          value={customMode ? -1 : frequency}
          onChange={(value) => {
            if (value === -1) {
              setCustomMode(true);
            } else {
              setCustomMode(false);
              setFrequency(value);
            }
          }}
        />
      </Field>

      {customMode && (
        <Field label="Custom interval (days)">
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            placeholder="45"
          />
        </Field>
      )}

      <Field label="Tags">
        <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} placeholder="founder, mentor…" />
      </Field>

      <Field label="Notes">
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How you met, what you talked about, follow-ups…"
        />
      </Field>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <Button type="submit" size="lg" fullWidth disabled={!valid || submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
