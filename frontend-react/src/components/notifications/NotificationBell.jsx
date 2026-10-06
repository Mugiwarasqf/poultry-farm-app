import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { badgeCount } from '../../lib/notifications/format';
import { NotificationItem } from './NotificationItem';
import { NotificationSkeleton, NotificationsEmpty, NotificationsError } from './NotificationStates';
import { moveFocusInList, useOpenNotification, usePresence } from './hooks';
import { BellIcon } from '../ui/BellIcon';

const DROPDOWN_LIMIT = 5;

/**
 * Header bell with an unread badge and the recent-notifications dropdown.
 *
 * Closes on: outside click, Escape (focus returns to the bell), clicking the
 * bell again, tabbing out of the panel, or any route change. On phones the
 * panel is pinned to the viewport edges under the header so it can never
 * run off-screen; from `sm` up it hangs from the bell.
 */
export function NotificationBell() {
  const { notifications, unreadCount, status, error, now, refresh, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const { mounted, visible } = usePresence(open);
  const location = useLocation();
  const panelId = useId();

  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const bellRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const listRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  // Set when opened from the keyboard, so focus lands on the first row.
  const focusFirstOnOpen = useRef(false);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) bellRef.current?.focus();
  }, []);

  const openNotification = useOpenNotification(close);

  // Any navigation closes it.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (/** @type {MouseEvent} */ e) => {
      if (rootRef.current && !rootRef.current.contains(/** @type {Node} */ (e.target))) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // Move focus into the panel once it is on screen.
  useEffect(() => {
    if (!open || !visible) return;
    const first = /** @type {HTMLElement | null} */ (listRef.current?.querySelector('[data-notification-item]'));
    if (focusFirstOnOpen.current && first) first.focus();
    else panelRef.current?.focus({ preventScroll: true });
    focusFirstOnOpen.current = false;
  }, [open, visible]);

  // Refresh quietly each time it opens, so it's current without waiting for the poll.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const onBellKeyDown = (/** @type {import('react').KeyboardEvent} */ e) => {
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault();
      focusFirstOnOpen.current = true;
      setOpen(true);
    }
  };

  const onPanelKeyDown = (/** @type {import('react').KeyboardEvent} */ e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close(true);
      return;
    }
    moveFocusInList(e, listRef.current);
  };

  const onPanelBlur = (/** @type {import('react').FocusEvent} */ e) => {
    // Tabbing out of the panel (not to the bell) closes it.
    const next = /** @type {Node | null} */ (e.relatedTarget);
    if (next && rootRef.current && !rootRef.current.contains(next)) setOpen(false);
  };

  const recent = notifications.slice(0, DROPDOWN_LIMIT);
  const showSkeleton = status === 'idle' || (status === 'loading' && notifications.length === 0);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={bellRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onBellKeyDown}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={`relative p-2 rounded-full transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-stone-300 ${
          open ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
        }`}
      >
        <BellIcon size={19} strokeWidth={1.9} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-stone-900 text-white text-[10px] font-semibold leading-4 text-center tabular-nums ring-2 ring-white"
          >
            {badgeCount(unreadCount)}
          </span>
        )}
      </button>

      {mounted && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
          onBlur={onPanelBlur}
          className={`z-50 fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[384px] flex flex-col max-h-[min(560px,calc(100dvh-5rem))] rounded-xl border border-stone-200/90 bg-white outline-none shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-6px_rgba(0,0,0,0.12),0_24px_48px_-16px_rgba(0,0,0,0.10)] origin-top sm:origin-top-right transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transition-none ${
            visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-[0.98] pointer-events-none'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 h-12 border-b border-stone-100 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[13px] font-semibold text-stone-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-1.5 h-5 inline-flex items-center rounded-md bg-stone-100 text-[11px] font-medium text-stone-600 tabular-nums">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 h-7 px-2 -mr-2 rounded-md text-[12px] font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-stone-300 disabled:opacity-40 disabled:pointer-events-none"
            >
              <CheckCheck size={14} strokeWidth={2} aria-hidden="true" />
              Mark all as read
            </button>
          </div>

          {/* Body */}
          <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain">
            {showSkeleton ? (
              <NotificationSkeleton rows={3} compact />
            ) : status === 'error' && notifications.length === 0 ? (
              <NotificationsError compact message={error} onRetry={refresh} />
            ) : recent.length === 0 ? (
              <NotificationsEmpty compact />
            ) : (
              <ul className="divide-y divide-stone-100" aria-label="Recent notifications">
                {recent.map((n) => (
                  <li key={n.id}>
                    <NotificationItem notification={n} now={now} onSelect={openNotification} compact />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-stone-100 p-1.5 shrink-0">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center h-9 rounded-lg text-[12.5px] font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
