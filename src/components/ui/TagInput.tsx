import { useState, type KeyboardEvent } from 'react';
import styles from './TagInput.module.css';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({ value, onChange, suggestions = [], placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('');

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === 'Backspace' && !draft && value.length) {
      removeTag(value[value.length - 1]);
    }
  }

  const unusedSuggestions = suggestions.filter(
    (s) => !value.some((t) => t.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.box}>
        {value.map((tag) => (
          <span key={tag} className={styles.chip}>
            {tag}
            <button type="button" className={styles.remove} onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
              ×
            </button>
          </span>
        ))}
        <input
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={value.length ? '' : placeholder ?? 'Add tags…'}
          inputMode="text"
          autoCapitalize="none"
        />
      </div>
      {unusedSuggestions.length > 0 && (
        <div className={styles.suggestions}>
          {unusedSuggestions.slice(0, 8).map((s) => (
            <button key={s} type="button" className={styles.suggestion} onClick={() => addTag(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
