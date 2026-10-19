import { BellOff, CircleAlert, RefreshCw } from 'lucide-react';

/** Placeholder rows shaped like real ones, so nothing jumps when data lands. */
export function NotificationSkeleton({ rows = 4, compact = false }) {
  return (
    <div role="status" aria-label="Loading notifications" className="divide-y divide-stone-100 dark:divide-[#2B3238]">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`flex items-start gap-3 ${compact ? 'px-4 py-3' : 'px-4 sm:px-5 py-3.5'}`}>
          <span className={`${compact ? 'w-8 h-8 rounded-lg' : 'w-9 h-9 rounded-[10px]'} shrink-0 bg-stone-100 dark:bg-[#2B3238] animate-pulse`} />
          <span className="flex-1 space-y-2 pt-1">
            <span className="flex justify-between gap-6">
              <span className="block h-3 rounded bg-stone-100 dark:bg-[#2B3238] animate-pulse" style={{ width: `${55 - (i % 3) * 10}%` }} />
              <span className="block h-3 w-10 rounded bg-stone-100 dark:bg-[#2B3238] animate-pulse" />
            </span>
            <span className="block h-2.5 rounded bg-stone-100/80 dark:bg-[#2B3238]/80 animate-pulse" style={{ width: `${85 - (i % 2) * 20}%` }} />
          </span>
        </div>
      ))}
      <span className="sr-only">Loading notifications</span>
    </div>
  );
}

function StateFrame({ icon: Icon, title, description, children, compact }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'px-6 py-10' : 'px-6 py-16'}`}>
      <span className="w-10 h-10 rounded-full border border-stone-200 dark:border-[#2B3238] bg-white dark:bg-[#1E2124] flex items-center justify-center text-stone-500 dark:text-[#64748B] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="mt-3 text-[13px] font-semibold text-stone-900 dark:text-[#F5F7F5]">{title}</p>
      {description && <p className="mt-1 text-[12.5px] text-stone-500 dark:text-[#64748B] max-w-[260px] leading-relaxed">{description}</p>}
      {children}
    </div>
  );
}

export function NotificationsEmpty({ compact = false, unreadOnly = false }) {
  return (
    <StateFrame
      compact={compact}
      icon={BellOff}
      title={unreadOnly ? 'No unread notifications' : "You're all caught up"}
      description={
        unreadOnly
          ? 'Everything here has been read.'
          : 'Vaccinations due, low feed and other reminders will show up here.'
      }
    />
  );
}

export function NotificationsError({ message, onRetry, compact = false }) {
  return (
    <StateFrame
      compact={compact}
      icon={CircleAlert}
      title="Couldn't load notifications"
      description={message || 'Check your connection and try again.'}
    >
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 dark:border-[#2B3238] bg-white dark:bg-[#1E2124] text-[12.5px] font-medium text-stone-700 dark:text-[#94A3B8] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-stone-50 dark:hover:bg-[#2B3238] hover:text-stone-900 dark:hover:text-[#F5F7F5] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
        >
          <RefreshCw size={13} strokeWidth={2} aria-hidden="true" />
          Try again
        </button>
      )}
    </StateFrame>
  );
}
