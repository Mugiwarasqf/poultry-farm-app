import { NotificationIcon } from './NotificationIcon';
import { relativeTime, fullTime } from '../../lib/notifications/format';

/**
 * One notification row, shared by the header dropdown and the full page.
 *
 * The row itself is a button (open / mark as read). The page passes extra
 * `actions`, which sit beside that button rather than inside it, so there
 * are never nested interactive elements.
 *
 * @param {Object} props
 * @param {import('../../lib/notifications/types').Notification} props.notification
 * @param {number} props.now
 * @param {(n: import('../../lib/notifications/types').Notification) => void} props.onSelect
 * @param {boolean} [props.compact]   Dropdown density.
 * @param {import('react').ReactNode} [props.actions]
 */
export function NotificationItem({ notification: n, now, onSelect, compact = false, actions }) {
  const unread = !n.read;

  return (
    <div className="group relative flex items-stretch bg-white transition-colors hover:bg-stone-50/80">
      <button
        type="button"
        data-notification-item=""
        onClick={() => onSelect(n)}
        aria-label={`${unread ? 'Unread. ' : ''}${n.title}. ${n.message} ${fullTime(n.created_at)}`}
        className={`flex-1 min-w-0 flex items-start gap-3 text-left cursor-pointer outline-none transition-colors focus-visible:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-300 ${
          compact ? 'px-4 py-3' : 'px-4 sm:px-5 py-3.5'
        }`}
      >
        <NotificationIcon type={n.type} size={compact ? 'sm' : 'md'} />

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3 min-w-0">
            <span
              className={`min-w-0 text-[13px] leading-5 truncate ${
                unread ? 'font-semibold text-stone-900' : 'font-medium text-stone-600'
              }`}
            >
              {n.title}
            </span>
            <time
              dateTime={n.created_at}
              title={fullTime(n.created_at)}
              className="shrink-0 text-[11px] leading-5 text-stone-400 tabular-nums"
            >
              {relativeTime(n.created_at, now)}
            </time>
          </span>
          <span
            className={`mt-0.5 block text-[12.5px] leading-[18px] line-clamp-2 ${
              unread ? 'text-stone-500' : 'text-stone-400'
            }`}
          >
            {n.message}
          </span>
        </span>

        {/* Unread: a small green dot. */}
        <span className="w-2 shrink-0 flex justify-center pt-2" aria-hidden="true">
          {unread && <span className="w-2 h-2 rounded-full bg-[#0D5C3A]" />}
        </span>
      </button>

      {actions && <div className="flex items-center gap-0.5 pr-3 sm:pr-4 shrink-0">{actions}</div>}
    </div>
  );
}
