import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useBatches } from './BatchContext';
import { notificationSource } from '../lib/notifications/source';
import { PREFS_EVENT } from '../lib/notifications/prefs';
import { NOTIFICATIONS_CHANGED_EVENT } from '../lib/notifications/localEvents';

/**
 * One source of truth for notifications: the header bell, its dropdown and
 * the /notifications page all read from here, so marking one as read in any
 * of them updates the others instantly.
 *
 * There is no push channel on the backend, so "realtime" is a refetch every
 * two minutes while the tab is visible, plus one whenever the farmer comes
 * back to the tab. Background refetches never flip the list back to its
 * loading skeleton.
 *
 * @typedef {import('../lib/notifications/types').Notification} Notification
 * @typedef {import('../lib/notifications/types').NotificationStatus} NotificationStatus
 *
 * @typedef {Object} NotificationContextValue
 * @property {Notification[]} notifications  Newest first.
 * @property {number} unreadCount
 * @property {NotificationStatus} status
 * @property {string | null} error
 * @property {number} now                    Re-renders relative times each minute.
 * @property {() => Promise<void>} refresh
 * @property {(id: string) => void} markRead
 * @property {() => void} markAllRead
 * @property {(id: string) => void} remove
 * @property {() => void} clearAll
 */

const POLL_MS = 2 * 60 * 1000;
const CLOCK_MS = 60 * 1000;

/** @type {import('react').Context<NotificationContextValue | null>} */
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isLoggedIn, farmId } = useAuth();
  const { batches } = useBatches();

  const [notifications, setNotifications] = useState(/** @type {Notification[]} */ ([]));
  const [status, setStatus] = useState(/** @type {NotificationStatus} */ ('idle'));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [now, setNow] = useState(() => Date.now());

  // Only the newest request may write state, so a slow response can't
  // overwrite a newer one.
  const requestId = useRef(0);
  const hasLoaded = useRef(false);

  const ctx = useMemo(() => ({ farmId, batches }), [farmId, batches]);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) return;
    const id = ++requestId.current;
    if (!hasLoaded.current) setStatus('loading');
    try {
      const list = await notificationSource.list(ctx);
      if (id !== requestId.current) return;
      hasLoaded.current = true;
      setNotifications(list);
      setError(null);
      setStatus('ready');
      setNow(Date.now());
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Could not load notifications.');
      // Keep showing what we had; only an empty first load becomes an error screen.
      setStatus(hasLoaded.current ? 'ready' : 'error');
    }
  }, [isLoggedIn, ctx]);

  // Load on sign-in and whenever the batch list changes; clear on sign-out.
  useEffect(() => {
    if (!isLoggedIn) {
      requestId.current++;
      hasLoaded.current = false;
      setNotifications([]);
      setStatus('idle');
      setError(null);
      return;
    }
    refresh();
  }, [isLoggedIn, refresh]);

  // Poll while visible, refetch on return to the tab or a settings change.
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(PREFS_EVENT, refresh);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(PREFS_EVENT, refresh);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    };
  }, [isLoggedIn, refresh]);

  // Keep "2m ago" honest without refetching.
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(clock);
  }, []);

  /**
   * Optimistic: update the list first, then tell the source. If the source
   * fails, refetch so the list shows the truth again.
   */
  const apply = useCallback(
    (/** @type {(list: Notification[]) => Notification[]} */ update, /** @type {() => Promise<void>} */ persist) => {
      setNotifications(update);
      persist().catch(() => {
        setError('That change could not be saved. Please try again.');
        refresh();
      });
    },
    [refresh]
  );

  const markRead = useCallback(
    (/** @type {string} */ id) => {
      apply(
        (list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)),
        () => notificationSource.markRead(ctx, [id])
      );
    },
    [apply, ctx]
  );

  const markAllRead = useCallback(() => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    apply(
      (list) => list.map((n) => ({ ...n, read: true })),
      () => notificationSource.markRead(ctx, ids)
    );
  }, [apply, ctx, notifications]);

  const remove = useCallback(
    (/** @type {string} */ id) => {
      apply(
        (list) => list.filter((n) => n.id !== id),
        () => notificationSource.remove(ctx, [id])
      );
    },
    [apply, ctx]
  );

  const clearAll = useCallback(() => {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;
    apply(
      () => [],
      () => notificationSource.remove(ctx, ids)
    );
  }, [apply, ctx, notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      status,
      error,
      now,
      refresh,
      markRead,
      markAllRead,
      remove,
      clearAll,
    }),
    [notifications, status, error, now, refresh, markRead, markAllRead, remove, clearAll]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

/** @returns {NotificationContextValue} */
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
