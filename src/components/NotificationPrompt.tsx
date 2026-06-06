import { useState } from 'react';
import { usePush } from '../hooks/usePush';
import { Button } from './ui/Button';
import { isNotifPromptDismissed, dismissNotifPrompt } from '../lib/prefs';
import styles from './NotificationPrompt.module.css';

/** iPhone/iPad — push only works once the PWA is added to the Home Screen. */
function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Dismissible nudge to turn on the daily reminder. Tapping "Turn on" reveals
 * how to enable it — including the iOS catch that notifications only work after
 * you Share → Add to Home Screen and open the installed app.
 */
export function NotificationPrompt() {
  const push = usePush();
  const [dismissed, setDismissed] = useState(isNotifPromptDismissed());
  const [expanded, setExpanded] = useState(false);

  const status = push.status;
  // Only nudge when reminders are available but not yet switched on.
  if (dismissed || !status || !status.supported || !status.configured || status.subscribed) {
    return null;
  }

  // `installable` is true only when running as the installed Home Screen app.
  const needsInstall = isIOS() && !status.installable;

  function dismiss() {
    dismissNotifPrompt();
    setDismissed(true);
  }

  return (
    <div className={styles.banner}>
      <button type="button" className={styles.close} onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>

      <div className={styles.head}>
        <span aria-hidden>🔔</span>
        <span className={styles.title}>Turn on daily reminders so you never forget to reconnect.</span>
      </div>

      {!expanded ? (
        <Button size="sm" onClick={() => setExpanded(true)}>
          Turn on
        </Button>
      ) : (
        <div className={styles.detail}>
          {needsInstall && (
            <>
              <p className={styles.note}>On iPhone, notifications only work once Reconnect is on your Home Screen:</p>
              <ol className={styles.steps}>
                <li>
                  Tap the <strong>Share</strong> button (the square with an arrow pointing up) in Safari's toolbar.
                </li>
                <li>
                  Choose <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Open <strong>Reconnect</strong> from your Home Screen, then come back here and tap <strong>Enable</strong>.
                </li>
              </ol>
            </>
          )}

          <Button size="sm" fullWidth onClick={push.enable} disabled={push.busy}>
            {push.busy ? 'Enabling…' : 'Enable notifications'}
          </Button>

          {push.error && <p className={styles.error}>{push.error}</p>}
          <p className={styles.note}>You'll get one summary per day at 9 AM. Tapping it opens your dashboard.</p>
        </div>
      )}
    </div>
  );
}
