/**
 * Notifications the app raises itself, about things that happen on this
 * device (a report finishing, for example) rather than in the farm's
 * records. Kept per farm in localStorage, newest first, capped.
 *
 * @typedef {import('./types').Notification} Notification
 */

export const NOTIFICATIONS_CHANGED_EVENT = 'farmbook:notifications-changed';
const MAX_EVENTS = 50;

function key(farmId) {
  return `farmbook_local_notifications_${farmId || 'default'}`;
}

/** @returns {Omit<Notification, 'read'>[]} */
export function readLocalEvents(farmId) {
  try {
    const list = JSON.parse(localStorage.getItem(key(farmId)) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Raise a notification from anywhere in the app. The notification list
 * refreshes straight away.
 *
 * @param {{ type: string, title: string, message: string, link?: string }} event
 */
export function addLocalNotification(event) {
  const farmId = localStorage.getItem('farmbook_farmid');
  const entry = {
    ...event,
    id: `${event.type}:${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(key(farmId), JSON.stringify([entry, ...readLocalEvents(farmId)].slice(0, MAX_EVENTS)));
  } catch {
    // Storage full or blocked — skip; it's a convenience, not a record.
  }
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}
