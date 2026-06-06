/**
 * Small localStorage-backed preferences that live outside the contact database:
 * the address backups are emailed to, and when the last backup happened (used to
 * nag the user before they lose their only copy). Kept separate from IndexedDB
 * so clearing it never touches contact data, and vice-versa.
 */
import { nowTimestamp } from './date';

const BACKUP_EMAIL_KEY = 'reconnect.backupEmail';
const LAST_BACKUP_KEY = 'reconnect.lastBackupAt';
const NOTIF_PROMPT_DISMISSED_KEY = 'reconnect.notifPromptDismissed';

/** Remind the user to back up once this many days have passed. */
export const BACKUP_REMINDER_DAYS = 14;

export function getBackupEmail(): string {
  try {
    return localStorage.getItem(BACKUP_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setBackupEmail(email: string): void {
  try {
    localStorage.setItem(BACKUP_EMAIL_KEY, email.trim());
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function getLastBackupAt(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

/** Record that a backup just happened (any export the user could keep). */
export function markBackedUp(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, nowTimestamp());
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** Whether the user dismissed the "turn on notifications" nudge. */
export function isNotifPromptDismissed(): boolean {
  try {
    return localStorage.getItem(NOTIF_PROMPT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissNotifPrompt(): void {
  try {
    localStorage.setItem(NOTIF_PROMPT_DISMISSED_KEY, '1');
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** Whole days since the last backup, or `null` if the user never backed up. */
export function daysSinceBackup(): number | null {
  const last = getLastBackupAt();
  if (!last) return null;
  const ms = Date.now() - new Date(last).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86_400_000));
}
