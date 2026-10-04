import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { groupByDate } from '../lib/notifications/format';
import { CATEGORY_FILTERS } from '../lib/notifications/meta';
import { NotificationCard } from '../components/notifications/NotificationCard';
import { NotificationSkeleton, NotificationsEmpty, NotificationsError } from '../components/notifications/NotificationStates';
import { moveFocusInList, useOpenNotification } from '../components/notifications/hooks';
import { Modal } from '../components/ui/Modal';

const PAGE_SIZE = 20;

const cardShell = 'bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden';

export function NotificationsPage() {
  const { notifications, unreadCount, status, error, now, refresh, markAllRead, remove, clearAll } = useNotifications();
  const [category, setCategory] = useState('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const openNotification = useOpenNotification();

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [category]);

  const unreadByCategory = useMemo(() => {
    const counts = {};
    notifications.forEach((n) => {
      if (!n.read) counts[n.category] = (counts[n.category] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  const filtered = useMemo(
    () => (category === 'all' ? notifications : notifications.filter((n) => n.category === category)),
    [notifications, category]
  );
  const shown = filtered.slice(0, limit);
  const groups = useMemo(() => groupByDate(shown, now), [shown, now]);
  const remaining = filtered.length - shown.length;
  const categoryLabel = CATEGORY_FILTERS.find((c) => c.id === category)?.label;

  // Keep keyboard users in place after deleting a card.
  const removeAndKeepFocus = (/** @type {string} */ id) => {
    const cards = [...(listRef.current?.querySelectorAll('[data-notification-id]') || [])];
    const index = cards.findIndex((el) => el.getAttribute('data-notification-id') === id);
    remove(id);
    requestAnimationFrame(() => {
      const after = [...(listRef.current?.querySelectorAll('[data-notification-item]') || [])];
      /** @type {HTMLElement | undefined} */ (after[Math.min(index, after.length - 1)])?.focus();
    });
  };

  const showSkeleton = status === 'idle' || (status === 'loading' && notifications.length === 0);

  return (
    <div className="max-w-4xl lg:max-w-none mx-auto pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-full bg-[#0D5C3A] text-white flex items-center justify-center shrink-0 shadow-xs" aria-hidden="true">
          <Bell size={22} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-heading">Notifications</h1>
          <p className="text-sm text-stone-500 mt-1.5 max-w-xl leading-relaxed">
            Stay updated with your farm activities, batch updates, and important alerts.
          </p>
        </div>
      </div>

      {/* Filter pills + bulk actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter notifications by category"
          className="relative flex gap-2 min-w-0 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {CATEGORY_FILTERS.map((c, index) => {
            const selected = category === c.id;
            const unread = c.id === 'all' ? unreadCount : unreadByCategory[c.id] || 0;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="notifications-list"
                tabIndex={selected ? 0 : -1}
                data-category={c.id}
                onClick={() => setCategory(c.id)}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                  e.preventDefault();
                  const step = e.key === 'ArrowRight' ? 1 : -1;
                  const next = CATEGORY_FILTERS[(index + step + CATEGORY_FILTERS.length) % CATEGORY_FILTERS.length].id;
                  setCategory(next);
                  /** @type {HTMLElement | null} */ (e.currentTarget.parentElement?.querySelector(`[data-category="${next}"]`))?.focus();
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A]/40 focus-visible:ring-offset-2 ${
                  selected ? 'bg-[#0D5C3A] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {c.label}
                {unread > 0 && (
                  <span
                    className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold leading-5 text-center tabular-nums ${
                      selected ? 'bg-white/20 text-white' : 'bg-white text-stone-600'
                    }`}
                  >
                    {unread}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D5C3A] hover:text-[#094229] hover:underline underline-offset-4 cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A]/40 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Check size={16} strokeWidth={2.25} aria-hidden="true" />
            Mark all as read
          </button>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={notifications.length === 0}
            className="text-sm font-medium text-stone-500 hover:text-stone-900 cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-stone-300 disabled:opacity-40 disabled:pointer-events-none"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* A refresh failed but earlier results are still on screen. */}
      {error && status === 'ready' && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-[13px] text-stone-600">
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1 font-semibold text-[#0D5C3A] hover:underline cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A]/40"
          >
            <RefreshCw size={13} strokeWidth={2} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      {/* List */}
      <div
        id="notifications-list"
        role="tabpanel"
        aria-label={category === 'all' ? 'All notifications' : `${categoryLabel} notifications`}
        ref={listRef}
        onKeyDown={(e) => moveFocusInList(e, listRef.current)}
      >
        {showSkeleton ? (
          <div className={cardShell}>
            <NotificationSkeleton rows={5} />
          </div>
        ) : status === 'error' && notifications.length === 0 ? (
          <div className={cardShell}>
            <NotificationsError message={error} onRetry={refresh} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={cardShell}>
            {category === 'all' || notifications.length === 0 ? (
              <NotificationsEmpty />
            ) : (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-semibold text-stone-900">No {categoryLabel?.toLowerCase()} notifications</p>
                <p className="mt-1 text-[13px] text-stone-500">Anything new in this category will show up here.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.label} aria-labelledby={`group-${group.label}`} className="space-y-3">
                <h2 id={`group-${group.label}`} className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {group.label}
                </h2>
                <ul className="space-y-3">
                  {group.items.map((n) => (
                    <li key={n.id} data-notification-id={n.id}>
                      <NotificationCard notification={n} now={now} onSelect={openNotification} onDelete={removeAndKeepFocus} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {remaining > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-stone-100 text-sm font-semibold text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A]/40"
          >
            Show more
            <span className="text-stone-400 tabular-nums">{remaining}</span>
          </button>
        </div>
      )}

      <Modal
        open={confirmClear}
        title="Clear all notifications?"
        onClose={() => setConfirmClear(false)}
        actions={
          <>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="h-9 px-4 rounded-lg border border-stone-200 bg-white text-sm font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                clearAll();
                setConfirmClear(false);
              }}
              className="h-9 px-4 rounded-lg bg-[#0D5C3A] text-sm font-semibold text-white hover:bg-[#094229] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A]/40 focus-visible:ring-offset-2"
            >
              Clear all
            </button>
          </>
        }
      >
        This removes all {notifications.length} notification{notifications.length === 1 ? '' : 's'} from this list. If a
        vaccination is still due or feed is still low, a fresh reminder will appear when the situation changes.
      </Modal>
    </div>
  );
}

export default NotificationsPage;
