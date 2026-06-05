import { useEffect, useRef, useState } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { useMetrics } from '../hooks/useMetrics';
import { usePush } from '../hooks/usePush';
import { backupService } from '../services/backupService';
import { downloadBlob, readFileAsText } from '../lib/download';
import { emailBackup } from '../lib/share';
import { isStoragePersisted } from '../lib/storage';
import { Field, TextInput } from '../components/ui/Field';
import {
  getBackupEmail,
  setBackupEmail,
  markBackedUp,
  daysSinceBackup,
} from '../lib/prefs';
import { todayISO } from '../lib/date';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { data: metrics } = useMetrics();
  const push = usePush();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [backupEmail, setBackupEmailValue] = useState(getBackupEmail());
  const [lastBackupDays, setLastBackupDays] = useState<number | null>(daysSinceBackup());
  const [emailing, setEmailing] = useState(false);

  useEffect(() => {
    void isStoragePersisted().then(setPersisted);
  }, []);

  function recordBackup() {
    markBackedUp();
    setLastBackupDays(0);
  }

  function updateBackupEmail(value: string) {
    setBackupEmailValue(value);
    setBackupEmail(value);
  }

  async function exportJson() {
    const blob = await backupService.exportToBlob();
    downloadBlob(blob, `reconnect-backup-${todayISO()}.json`);
    recordBackup();
  }

  async function exportCsv() {
    const blob = await backupService.exportCsv();
    downloadBlob(blob, `reconnect-contacts-${todayISO()}.csv`);
  }

  async function emailMyBackup() {
    const to = backupEmail.trim();
    if (!to) {
      setMessage('Enter a backup email address first.');
      return;
    }
    setEmailing(true);
    setMessage(null);
    try {
      const result = await emailBackup(to);
      recordBackup();
      setMessage(
        result === 'shared'
          ? 'Backup ready — choose Mail in the share sheet and send it to yourself.'
          : `Backup downloaded — attach it to the email opening for ${to}, then send.`,
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return; // user cancelled the share sheet
      setMessage('Could not start the email. Try the manual export instead.');
    } finally {
      setEmailing(false);
    }
  }

  const lastBackupLabel =
    lastBackupDays === null
      ? 'No backup yet'
      : lastBackupDays === 0
        ? 'Last backup: today'
        : `Last backup: ${lastBackupDays} day${lastBackupDays === 1 ? '' : 's'} ago`;

  async function importJson(file: File) {
    if (!window.confirm('Importing replaces ALL current contacts on this device. Continue?')) return;
    try {
      const text = await readFileAsText(file);
      const count = await backupService.import(JSON.parse(text));
      setMessage(`Restored ${count} contacts.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.');
    }
  }

  return (
    <>
      <Header title="Settings" large />

      {/* Network intelligence */}
      <SettingsGroup title="Network intelligence">
        <div className={styles.metricsGrid}>
          <Metric label="Total" value={metrics?.totalContacts ?? 0} />
          <Metric label="Overdue" value={metrics?.overdueContacts ?? 0} tone="red" />
          <Metric label="Due this week" value={metrics?.dueThisWeek ?? 0} tone="orange" />
          <Metric label="Recently contacted" value={metrics?.recentlyContacted ?? 0} tone="green" />
          <Metric label="Never contacted" value={metrics?.neverContacted ?? 0} />
          <Metric label="Network health" value={`${metrics?.networkHealth ?? 100}%`} tone="accent" />
        </div>
        {metrics && metrics.topTags.length > 0 && (
          <p className={styles.note}>
            Top circles: {metrics.topTags.slice(0, 5).map((t) => `${t.tag} (${t.count})`).join(', ')}
          </p>
        )}
      </SettingsGroup>

      {/* Notifications */}
      <SettingsGroup title="Daily reminder" footer={notificationFooter(push.status)}>
        {!push.status?.supported ? (
          <p className={styles.note}>Notifications aren't supported in this browser.</p>
        ) : !push.status.configured ? (
          <p className={styles.note}>
            Push isn't configured yet. Set <code>VITE_VAPID_PUBLIC_KEY</code> and{' '}
            <code>VITE_PUSH_API_URL</code>, then rebuild. See the README.
          </p>
        ) : push.status.subscribed ? (
          <div className={styles.row}>
            <Button variant="secondary" onClick={push.sendTest} disabled={push.busy}>
              Send test
            </Button>
            <Button variant="destructive" onClick={push.disable} disabled={push.busy}>
              Turn off
            </Button>
          </div>
        ) : (
          <Button size="lg" fullWidth onClick={push.enable} disabled={push.busy}>
            {push.busy ? 'Enabling…' : 'Enable daily reminder'}
          </Button>
        )}
        {push.error && <p className={styles.error}>{push.error}</p>}
      </SettingsGroup>

      {/* Data */}
      <SettingsGroup
        title="Your data"
        footer="Everything is stored privately on this device. Back up regularly, and to move to a new phone or view on a computer."
      >
        {persisted !== null && (
          <div className={`${styles.statusRow} ${persisted ? styles.statusOk : styles.statusWarn}`}>
            <span aria-hidden>{persisted ? '🔒' : '⚠️'}</span>
            {persisted
              ? 'Saved on this device · protected from auto-deletion'
              : 'Saved on this device · add to Home Screen to fully protect it'}
          </div>
        )}
        <div className={`${styles.statusRow} ${styles.statusNeutral}`}>
          <span aria-hidden>🗓️</span>
          {lastBackupLabel}
        </div>

        <div className={styles.backupEmail}>
          <Field
            label="Email backups to"
            hint="Saved on this device. Used to address the backup email — nothing is sent automatically."
          >
            <TextInput
              type="email"
              inputMode="email"
              autoCapitalize="none"
              placeholder="you@example.com"
              value={backupEmail}
              onChange={(e) => updateBackupEmail(e.target.value)}
            />
          </Field>
          <Button
            fullWidth
            onClick={emailMyBackup}
            disabled={emailing || backupEmail.trim().length === 0}
          >
            {emailing ? 'Preparing…' : '✉️ Email my backup'}
          </Button>
        </div>

        <div className={styles.stack}>
          <Button variant="secondary" fullWidth onClick={exportJson}>
            Export backup (JSON)
          </Button>
          <Button variant="secondary" fullWidth onClick={exportCsv}>
            Export contacts (CSV)
          </Button>
          <Button variant="secondary" fullWidth onClick={() => fileInput.current?.click()}>
            Restore from backup
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importJson(file);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p className={styles.note}>{message}</p>}

        <details className={styles.help}>
          <summary>Move to a new phone or view on a computer</summary>
          <ol className={styles.helpList}>
            <li>Tap <strong>Export backup (JSON)</strong> above and save the file (to Files, iCloud Drive, or email it to yourself).</li>
            <li>On the other device, open this same app in the browser.</li>
            <li>Tap <strong>Restore from backup</strong> and pick that file — all your contacts appear.</li>
          </ol>
          <p className={styles.helpNote}>
            This copies a <strong>snapshot</strong> — devices don't sync automatically. Whenever you want
            the latest data on another device, export again and restore. Your data always stays on your
            devices; nothing is uploaded unless you move the file yourself.
          </p>
        </details>
      </SettingsGroup>

      <p className={styles.about}>
        Reconnect · Personal Relationship CRM
        <br />
        Local-first · No accounts · No tracking
      </p>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className={styles.metric}>
      <span className={`${styles.metricValue} ${tone ? styles[tone] : ''}`}>{value}</span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  );
}

function SettingsGroup({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <div className={styles.card}>{children}</div>
      {footer && <p className={styles.footer}>{footer}</p>}
    </section>
  );
}

function notificationFooter(status: ReturnType<typeof usePush>['status']): string {
  if (!status) return '';
  if (status.supported && !status.installable) {
    return 'On iPhone: tap Share → Add to Home Screen, then open the app from your Home Screen to enable notifications. You get ONE summary per day at 9 AM.';
  }
  return 'One summary notification per day at 9 AM telling you who to reconnect with. Tapping it opens your dashboard.';
}
