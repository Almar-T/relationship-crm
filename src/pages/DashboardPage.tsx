import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Section } from '../components/ui/Section';
import { PersonCard } from '../components/people/PersonCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { BackupReminder } from '../components/BackupReminder';
import { useDashboard } from '../hooks/useDashboard';
import { formatHumanDate } from '../lib/date';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, loading } = useDashboard();

  const today = formatHumanDate(data?.reference ?? null);

  return (
    <>
      <Header title="Today" subtitle={today} large />

      <BackupReminder />

      {loading && !data ? (
        <Spinner label="Loading your network…" />
      ) : !data ? null : data.overdue.length + data.dueToday.length + data.dueSoon.length === 0 ? (
        <EmptyState
          icon="🌿"
          title="You're all caught up"
          description="No one is due right now. Add the people you want to keep in touch with and the app will tell you when to reach out."
          action={
            <Button onClick={() => navigate('/add')} size="lg">
              Add someone
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.heroWrap}>
            <div className={styles.hero}>
              <span className={styles.heroCount}>{data.actionableCount}</span>
              <span className={styles.heroText}>
                {data.actionableCount === 0
                  ? 'Nothing due today — nice work.'
                  : `${data.actionableCount === 1 ? 'person' : 'people'} to reconnect with`}
              </span>
            </div>
          </div>

          {data.overdue.length > 0 && (
            <Section title="Overdue" count={data.overdue.length} accent="red">
              {data.overdue.map((p) => (
                <PersonCard key={p.id} person={p} showContactAction />
              ))}
            </Section>
          )}

          {data.dueToday.length > 0 && (
            <Section title="Due today" count={data.dueToday.length} accent="orange">
              {data.dueToday.map((p) => (
                <PersonCard key={p.id} person={p} showContactAction />
              ))}
            </Section>
          )}

          {data.dueSoon.length > 0 && (
            <Section title="Due soon" count={data.dueSoon.length} accent="accent">
              {data.dueSoon.map((p) => (
                <PersonCard key={p.id} person={p} showContactAction />
              ))}
            </Section>
          )}
        </>
      )}
    </>
  );
}
