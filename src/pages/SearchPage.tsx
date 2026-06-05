import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Avatar } from '../components/ui/Avatar';
import { DueBadge } from '../components/ui/DueBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { useSearch } from '../hooks/usePeople';
import { getDueInfo } from '../services/contactScheduler';
import styles from './SearchPage.module.css';

export function SearchPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  // Debounce so search stays snappy while typing.
  useEffect(() => {
    const handle = window.setTimeout(() => setQuery(input), 120);
    return () => window.clearTimeout(handle);
  }, [input]);

  const { data: results } = useSearch(query);

  return (
    <>
      <Header title="Search" large />

      <div className={styles.searchWrap}>
        <div className={styles.searchBox}>
          <span className={styles.icon} aria-hidden>
            ⌕
          </span>
          <input
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Name, company, tag, notes…"
            type="search"
            inputMode="search"
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="search"
          />
          {input && (
            <button className={styles.clear} onClick={() => setInput('')} aria-label="Clear">
              ×
            </button>
          )}
        </div>
      </div>

      {results && results.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={query ? 'No matches' : 'Search your network'}
          description={query ? 'Try a different name, company or tag.' : 'Find anyone by name, company, where you met, tags or notes.'}
        />
      ) : (
        <ul className={styles.results}>
          {results?.map(({ person, matchedFields }) => {
            const info = getDueInfo(person);
            const bodyMatch = matchedFields.filter((f) => f !== 'Name');
            return (
              <li key={person.id}>
                <button className={styles.result} onClick={() => navigate(`/person/${person.id}`)}>
                  <Avatar name={person.name} size={40} />
                  <div className={styles.resultBody}>
                    <span className={styles.resultName}>{person.name}</span>
                    <span className={styles.resultMeta}>
                      {[person.role, person.company].filter(Boolean).join(' · ') || 'No company'}
                      {bodyMatch.length > 0 && query && (
                        <span className={styles.matched}> · matched in {bodyMatch.join(', ')}</span>
                      )}
                    </span>
                  </div>
                  <DueBadge info={info} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
