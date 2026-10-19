/**
 * The farmer's notification switches (Settings → Notifications). Shared by
 * that panel and the notification source, so turning a switch off there hides
 * the matching in-app notifications straight away.
 */

export const PREFS_KEY = 'farmbook_notification_prefs';
export const PREFS_EVENT = 'farmbook:notification-prefs';

export const DEFAULT_PREFS = {
  emailAlerts: true,
  vaccinationReminders: true,
  loggingNudges: true,
  feedAlerts: true,
  medicationAlerts: true,
  activityLogs: true,
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
    const next = { ...readPrefs(), ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked — the change still applies for this session.
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

/**
 * Reconciles remote farm preferences with device storage upon sign-in or farm refresh.
 */
export function syncPrefsFromFarm(remotePrefs) {
  if (!remotePrefs || typeof remotePrefs !== 'object') return;
  const current = readPrefs();
  const merged = { ...current, ...remotePrefs };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
  } catch {
    // Storage blocked
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}
