/**
 * The farmer's notification switches (Settings → Notifications). Shared by
 * that panel and the notification source, so turning a switch off there hides
 * the matching in-app notifications straight away.
 */

export const PREFS_KEY = 'farmbook_notification_prefs';
export const PREFS_EVENT = 'farmbook:notification-prefs';

export const DEFAULT_PREFS = {
  vaccinationReminders: true,
  loggingNudges: true,
};

export function readPrefs() {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked — the change still applies for this session.
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}
