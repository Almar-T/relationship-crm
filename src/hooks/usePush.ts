import { useCallback, useEffect, useState } from 'react';
import { pushService, type PushStatus } from '../services/pushService';

export function usePush() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await pushService.getStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        await refresh();
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    status,
    busy,
    error,
    enable: () => run(() => pushService.subscribe()),
    disable: () => run(() => pushService.unsubscribe()),
    sendTest: () => run(() => pushService.sendTest()),
    refresh,
  };
}
