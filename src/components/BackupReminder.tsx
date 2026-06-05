import { useNavigate } from 'react-router-dom';
import { usePeople } from '../hooks/usePeople';
import { daysSinceBackup, BACKUP_REMINDER_DAYS } from '../lib/prefs';
import styles from './BackupReminder.module.css';

/**
 * Nudges the user to back up before they could lose their only copy. Shown only
 * when there are contacts to lose and it's been a while (or never). Tapping it
 * jumps to Settings where the backup controls live.
 */
export function BackupReminder() {
  const navigate = useNavigate();
  const { data: people } = usePeople();

  const count = people?.length ?? 0;
  if (count === 0) return null;

  const days = daysSinceBackup();
  const overdue = days === null || days >= BACKUP_REMINDER_DAYS;
  if (!overdue) return null;

  const message =
    days === null
      ? "You haven't backed up yet — keep a safe copy in case this device is lost."
      : `It's been ${days} days since your last backup.`;

  return (
    <button type="button" className={styles.banner} onClick={() => navigate('/settings')}>
      <span className={styles.message}>⚠️ {message}</span>
      <span className={styles.cta}>Back up →</span>
    </button>
  );
}
