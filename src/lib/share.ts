/**
 * Emailing a backup to yourself, kept fully local: nothing is uploaded to a
 * server. On phones we hand the backup file to the native share sheet (where
 * Mail attaches it for you); everywhere else we download the file and open a
 * pre-addressed draft so you just attach and send. Either way the contact data
 * never leaves the device except through the message you send yourself.
 */
import { backupService } from '../services/backupService';
import { downloadBlob } from './download';
import { todayISO } from './date';

export type EmailBackupResult = 'shared' | 'mailto';

export async function emailBackup(toEmail: string): Promise<EmailBackupResult> {
  const blob = await backupService.exportToBlob();
  const filename = `reconnect-backup-${todayISO()}.json`;
  const file = new File([blob], filename, { type: 'application/json' });

  // Preferred path on iOS/Android: share the file itself so Mail attaches it.
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'Reconnect backup',
      text:
        `My Reconnect contacts backup (${todayISO()}). ` +
        `Email this file to ${toEmail} and keep it safe — ` +
        `restore it from the app's Settings to recover everything.`,
    });
    return 'shared';
  }

  // Fallback (most desktop browsers): download the file + open a pre-addressed draft.
  downloadBlob(blob, filename);
  const subject = encodeURIComponent(`Reconnect backup ${todayISO()}`);
  const body = encodeURIComponent(
    `Attach the file "${filename}" that was just downloaded, then send this to keep your contacts safe.`,
  );
  window.location.href = `mailto:${encodeURIComponent(toEmail)}?subject=${subject}&body=${body}`;
  return 'mailto';
}
