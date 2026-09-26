import { useCallback, useEffect, useState } from 'react';
import { flushQueue, getPendingCount, subscribe } from './offlineQueue';

/**
 * Tracks how many log entries are still waiting to send, and flushes them
 * whenever the device looks reachable again.
 *
 * Flush triggers are deliberately event-driven rather than a polling timer:
 * the browser's `online` event covers reconnects, and a flush on mount covers
 * the case where entries were queued in an earlier session and the app is
 * reopened already online.
 */
export function useOfflineQueue() {
  const [pending, setPending] = useState(0);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    setPending(await getPendingCount());
  }, []);

  const flush = useCallback(async () => {
    setSending(true);
    try {
      await flushQueue();
    } catch {
      // A failed flush is normal (still offline, token expired, storage
      // blocked). Entries stay queued and the next trigger retries, so this
      // must not surface as an unhandled rejection.
    } finally {
      setSending(false);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribe(refresh);
    return unsubscribe;
  }, [refresh]);

  useEffect(() => {
    // Attempt delivery on load, then on every reconnect.
    flush();
    const onOnline = () => flush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  return { pending, sending, flush };
}

export default useOfflineQueue;
