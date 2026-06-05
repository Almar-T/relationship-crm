import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Tag } from '../ui/Tag';
import { DueBadge } from '../ui/DueBadge';
import { StrengthMeter } from '../ui/StrengthMeter';
import { getDueInfo } from '../../services/contactScheduler';
import { personService } from '../../services/personService';
import type { Person } from '../../types/person';
import styles from './PersonCard.module.css';

interface PersonCardProps {
  person: Person;
  /** Show the inline "Contacted" quick-action (used on the dashboard). */
  showContactAction?: boolean;
}

export function PersonCard({ person, showContactAction }: PersonCardProps) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const info = getDueInfo(person);

  const subtitle = [person.role, person.company].filter(Boolean).join(' · ');

  async function handleContacted(event: React.MouseEvent) {
    event.stopPropagation();
    setSaving(true);
    try {
      await personService.markContactedToday(person.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={styles.card}
      onClick={() => navigate(`/person/${person.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/person/${person.id}`)}
    >
      <Avatar name={person.name} />

      <div className={styles.body}>
        <div className={styles.topline}>
          <h3 className={styles.name}>{person.name}</h3>
          <DueBadge info={info} />
        </div>

        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        <div className={styles.meta}>
          <StrengthMeter value={person.relationshipStrength} />
          {person.whereMet && <span className={styles.where}>· {person.whereMet}</span>}
        </div>

        {person.tags.length > 0 && (
          <div className={styles.tags}>
            {person.tags.slice(0, 4).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            {person.tags.length > 4 && <Tag>+{person.tags.length - 4}</Tag>}
          </div>
        )}
      </div>

      {showContactAction && (
        <button
          className={styles.contacted}
          onClick={handleContacted}
          disabled={saving}
          aria-label={`Mark ${person.name} contacted today`}
        >
          ✓
        </button>
      )}
    </article>
  );
}
