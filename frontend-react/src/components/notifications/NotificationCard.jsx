import { ChevronRight, X } from 'lucide-react';
import { NotificationIcon } from './NotificationIcon';
import { fullTime, relativeTimeLong } from '../../lib/notifications/format';

/**
 * One notification as a card on the Notifications page.
 *
 * The whole card is a single button (its ::after stretches over the card), so
 * clicking anywhere opens it. The delete button sits above that layer rather
 * than inside the button, so there are no nested interactive elements.
 *
 * @param {Object} props
 * @param {import('../../lib/notifications/types').Notification} props.notification
 * @param {number} props.now
 * @param {(n: import('../../lib/notifications/types').Notification) => void} props.onSelect
 * @param {(id: string) => void} props.onDelete
 */
export function NotificationCard({ notification: n, now, onSelect, onDelete }) {
  const unread = !n.read;

  return (
    <div
      className={`group relative flex items-center gap-3 sm:gap-4 rounded-xl border bg-white px-4 sm:px-5 py-4 shadow-xs transition-all hover:shadow-sm ${
        unread ? 'border-stone-200' : 'border-stone-200/70'
      } hover:border-stone-300 focus-within:border-stone-300`}
    >
      <NotificationIcon type={n.type} size="lg" />

      <div className="min-w-0 flex-1">
        <button
          type="button"
          data-notification-item=""
          onClick={() => onSelect(n)}
          aria-label={`${unread ? 'Unread. ' : ''}${n.title}. ${n.message} ${fullTime(n.created_at)}`}
          className="block w-full text-left cursor-pointer outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-[#B7DA3E]/50"
        >
          <span className={`block text-sm leading-5 truncate ${unread ? 'font-bold text-stone-950' : 'font-semibold text-stone-700'}`}>
            {n.title}
          </span>
          <span className="block mt-0.5 text-[13px] leading-[18px] text-stone-500 line-clamp-2">{n.message}</span>
          {/* On phones the time sits here, leaving the right edge for the dot and controls. */}
          <time dateTime={n.created_at} className="sm:hidden block mt-1 text-[11px] text-stone-400">
            {relativeTimeLong(n.created_at, now)}
          </time>
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <time dateTime={n.created_at} title={fullTime(n.created_at)} className="hidden sm:inline text-xs text-stone-400 whitespace-nowrap">
          {relativeTimeLong(n.created_at, now)}
        </time>

        <span
          aria-hidden="true"
          className={`w-2 h-2 rounded-full shrink-0 ${unread ? 'bg-[#DFFF83]' : 'bg-transparent'}`}
        />

        <button
          type="button"
          onClick={() => onDelete(n.id)}
          aria-label={`Delete "${n.title}"`}
          title="Delete"
          className="relative z-10 w-7 h-7 -my-1 inline-flex items-center justify-center rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-stone-300 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <X size={15} strokeWidth={2} aria-hidden="true" />
        </button>

        <ChevronRight size={18} strokeWidth={2} className="text-stone-400 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}
