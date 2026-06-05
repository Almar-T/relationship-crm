import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Avatar } from '../components/ui/Avatar';
import { Tag } from '../components/ui/Tag';
import { DueBadge } from '../components/ui/DueBadge';
import { StrengthMeter } from '../components/ui/StrengthMeter';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { usePerson } from '../hooks/usePeople';
import { personService } from '../services/personService';
import { getDueInfo, dueLabel } from '../services/contactScheduler';
import { smsHref, mailtoHref } from '../lib/contact';
import { formatHumanDate, relativeDayLabel } from '../lib/date';
import { RELATIONSHIP_STRENGTH_LABELS } from '../types/person';
import styles from './PersonDetailPage.module.css';

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: person, loading } = usePerson(id);
  const [busy, setBusy] = useState(false);
  const [justContacted, setJustContacted] = useState(false);

  if (loading) return <Spinner />;
  if (!person) {
    return (
      <>
        <Header title="" back />
        <EmptyState icon="🔍" title="Contact not found" description="This person may have been deleted." />
      </>
    );
  }

  const info = getDueInfo(person);

  async function contactedToday() {
    setBusy(true);
    try {
      await personService.markContactedToday(person!.id);
      setJustContacted(true);
      window.setTimeout(() => setJustContacted(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${person!.name}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await personService.remove(person!.id);
      navigate('/people', { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header
        title={person.name}
        back
        trailing={
          <Button variant="ghost" size="sm" onClick={() => navigate(`/person/${person.id}/edit`)}>
            Edit
          </Button>
        }
      />

      <div className={styles.hero}>
        <Avatar name={person.name} size={72} />
        <h1 className={styles.name}>{person.name}</h1>
        {(person.role || person.company) && (
          <p className={styles.subtitle}>{[person.role, person.company].filter(Boolean).join(' · ')}</p>
        )}
        <div className={styles.badges}>
          <DueBadge info={info} />
          <StrengthMeter value={person.relationshipStrength} showLabel />
        </div>
      </div>

      <div className={styles.actionBar}>
        <Button
          size="lg"
          fullWidth
          variant={justContacted ? 'success' : 'primary'}
          onClick={contactedToday}
          disabled={busy}
        >
          {justContacted ? '✓ Logged — next reminder set' : 'Contacted today'}
        </Button>
      </div>

      {(person.phone || person.email) && (
        <div className={styles.contactActions}>
          {person.phone && (
            <a className={styles.contactBtn} href={smsHref(person.phone)}>
              <span aria-hidden>💬</span> Message
            </a>
          )}
          {person.email && (
            <a className={styles.contactBtn} href={mailtoHref(person.email)}>
              <span aria-hidden>✉️</span> Email
            </a>
          )}
        </div>
      )}

      {person.tags.length > 0 && (
        <div className={styles.tags}>
          {person.tags.map((tag) => (
            <Tag key={tag} tone="accent">
              {tag}
            </Tag>
          ))}
        </div>
      )}

      <div className={styles.group}>
        {person.phone && <DetailRow label="Phone" value={person.phone} />}
        {person.email && <DetailRow label="Email" value={person.email} />}
        {person.whereMet && <DetailRow label="Where met" value={person.whereMet} />}
        <DetailRow
          label="Cadence"
          value={`Every ${person.contactFrequencyDays} days`}
        />
        <DetailRow label="Strength" value={RELATIONSHIP_STRENGTH_LABELS[person.relationshipStrength]} />
      </div>

      {person.notes && (
        <div className={styles.notesWrap}>
          <h3 className={styles.notesTitle}>Notes</h3>
          <p className={styles.notes}>{person.notes}</p>
        </div>
      )}

      <div className={styles.group}>
        <DetailRow label="Last contacted" value={`${formatHumanDate(person.lastContactDate)}${person.lastContactDate ? ` · ${relativeDayLabel(person.lastContactDate)}` : ''}`} />
        <DetailRow label="Next reach-out" value={`${formatHumanDate(person.nextContactDate)} · ${dueLabel(info)}`} />
        <DetailRow label="Added" value={formatHumanDate(person.createdDate.slice(0, 10))} />
      </div>

      <div className={styles.danger}>
        <Button variant="destructive" fullWidth onClick={remove} disabled={busy}>
          Delete contact
        </Button>
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}
