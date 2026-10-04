/**
 * @typedef {import('./types').Notification} Notification
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "2m ago", "3h ago", "4d ago", then "12 Sep". */
export function relativeTime(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, now - then);
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  const date = new Date(then);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/** "Just now", "5 minutes ago", "2 hours ago", "Yesterday", "3 days ago", then "12 Sep". */
export function relativeTimeLong(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, now - then);
  const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), 'minute');
  if (diff < DAY) return plural(Math.floor(diff / HOUR), 'hour');
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'Yesterday';
  if (days < 7) return plural(days, 'day');
  return relativeTime(iso, now);
}

/** Full date and time, for the tooltip / screen readers. */
export function fullTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Splits notifications into Today / Yesterday / Earlier, keeping order and
 * dropping empty groups.
 *
 * @param {Notification[]} items
 * @returns {{ label: string, items: Notification[] }[]}
 */
export function groupByDate(items, now = Date.now()) {
  const today = startOfDay(now);
  const yesterday = today - DAY;
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  items.forEach((n) => {
    const t = new Date(n.created_at).getTime();
    if (t >= today) groups.Today.push(n);
    else if (t >= yesterday) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  });
  return Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }));
}

/** "9+" once past nine. */
export function badgeCount(count) {
  return count > 9 ? '9+' : String(count);
}
