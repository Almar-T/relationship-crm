import { useRef, useState } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { useMetrics } from '../hooks/useMetrics';
import { usePush } from '../hooks/usePush';
import { backupService } from '../services/backupService';
import { downloadBlob, readFileAsText } from '../lib/download';
import { todayISO } from '../lib/date';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { data: metrics } = useMetrics();
  const push = usePush();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function exportJson() {
    const blob = await backupService.exportToBlob();
    downloadBlob(blob, `reconnect-backup-${todayISO()}.json`);
  }

  async function exportCsv() {
    const blob = await backupService.exportCsv();
    downloadBlob(blob, `reconnect-contacts-${todayISO()}.csv`);
  }

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
        footer="Everything is stored privately on this device. Back up regularly and to move to a new phone."
      >
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
