/**
 * Where notifications come from.
 *
 * There is no notifications table or endpoint on the backend (the server's
 * only notifications are the two daily reminder emails). Rather than mock
 * data, this source builds notifications from the farm's real records, which
 * the app already reads: vaccination schedules, the feed store, today's logs
 * and vitamin/dewormer courses. Read / deleted state is kept per farm on this
 * device.
 *
 * TO USE A REAL BACKEND: replace `notificationSource` below with an object of
 * the same shape whose methods call the API, e.g.
 *
 *   export const notificationSource = {
 *     list: async () => (await api('GET', '/notifications')).notifications,
 *     markRead: (_ctx, ids) => api('POST', '/notifications/read', { ids }),
 *     remove: (_ctx, ids) => api('POST', '/notifications/delete', { ids }),
 *   };
 *
 * Nothing else changes — NotificationContext only talks to this object.
 *
 * @typedef {import('./types').Notification} Notification
 * @typedef {import('./types').NotificationSource} NotificationSource
 * @typedef {import('./types').SourceContext} SourceContext
 */

import { getSchedule } from '../../api/schedule';
import { getLogs } from '../../api/logs';
import { getFeedPurchases } from '../../api/feedStock';
import { computeFeedStock, stockKey } from '../feeds';
import { loadSupplements, supplementDates, findSupplementType, toIso } from '../supplements';
import { formatBags, feedBags } from '../batch';
import { BATCHES_PER_GROUP, inGroups, safe } from '../farmData';
import { readPrefs } from './prefs';
import { notificationMeta } from './meta';
import { readLocalEvents } from './localEvents';

// Same window as the server's reminder email (3 days before, and on the day).
const DUE_SOON_DAYS = 3;
// How far back activity (completed batches, losses, feed, vitamins) is news.
const BATCH_COMPLETED_DAYS = 30;
const BIRD_LOSS_DAYS = 7;
const FEED_LOGGED_DAYS = 3;
const SUPPLEMENT_DAYS = 7;
// Past this, a finished withdrawal period stops being news.
const WITHDRAWAL_NEWS_DAYS = 14;
// The "nothing recorded today" nudge only appears from this hour.
const NUDGE_HOUR = 18;
const MAX_REMEMBERED = 500;

// ---- helpers --------------------------------------------------------------

/** A local-time moment on an ISO date, as an ISO timestamp. */
function at(isoDate, hour = 7) {
  return new Date(`${isoDate}T${String(hour).padStart(2, '0')}:00:00`).toISOString();
}

function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

function daysBetween(fromIso, toIsoDate) {
  return Math.round((new Date(`${toIsoDate}T00:00:00`) - new Date(`${fromIso}T00:00:00`)) / 86400000);
}

function shortDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Never date a notification in the future. */
function notAfterNow(iso) {
  const now = new Date().toISOString();
  return iso > now ? now : iso;
}

const isActive = (b) => (b.status || 'active') !== 'closed';

// ---- builders (one per notification type) ---------------------------------

function vaccinationNotifications(batch, schedule, today) {
  const out = [];
  schedule.forEach((s) => {
    if (s.status === 'done' || !s.dueDate) return;
    const dose = s.doseNumber ? ` · ${s.doseNumber}` : '';
    const days = daysBetween(today, s.dueDate);

    if (s.status === 'missed' || days < 0) {
      out.push({
        id: `vaccination_overdue:${s.scheduleId}`,
        type: 'vaccination_overdue',
        title: `${s.vaccineName} is overdue`,
        message: `${batch.name}${dose} — was due ${shortDate(s.dueDate)}. Record it if it was given, or give it as soon as you can.`,
        link: `/batches/${batch.batchId}`,
        created_at: notAfterNow(at(addDays(s.dueDate, 1))),
      });
      return;
    }

    if (days <= DUE_SOON_DAYS) {
      const when = days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : `due in ${days} days`;
      const windowOpened = at(addDays(s.dueDate, -DUE_SOON_DAYS));
      const created = s.createdAt && s.createdAt > windowOpened ? s.createdAt : windowOpened;
      out.push({
        id: `vaccination_due:${s.scheduleId}`,
        type: 'vaccination_due',
        title: `${s.vaccineName} ${when}`,
        message: `${batch.name}${dose} — scheduled for ${shortDate(s.dueDate)}.`,
        link: `/batches/${batch.batchId}`,
        created_at: notAfterNow(created),
      });
    }
  });
  return out;
}

function feedNotifications(purchases, usage) {
  if (purchases.length === 0) return [];
  const { lines } = computeFeedStock(purchases, usage);

  // When a line last changed — the moment it tipped into low / out.
  const lastTouched = new Map();
  [...purchases, ...usage].forEach((entry) => {
    const key = stockKey(entry);
    const when = entry.createdAt || (entry.date ? at(entry.date, 12) : '');
    if (when && (!lastTouched.has(key) || when > lastTouched.get(key))) lastTouched.set(key, when);
  });

  return lines
    .filter((line) => line.status !== 'ok')
    .map((line) => {
      const created = notAfterNow(lastTouched.get(line.key) || new Date().toISOString());
      if (line.status === 'out') {
        return {
          id: `feed_out:${line.key}`,
          type: 'feed_out',
          title: `Out of ${line.label}`,
          message: 'None left in the feed store. Add the feed you buy so batch usage keeps counting down.',
          link: '/inventory',
          created_at: created,
        };
      }
      const lasts = line.daysLeft != null ? ` — about ${line.daysLeft} day${line.daysLeft === 1 ? '' : 's'} at your current use` : '';
      return {
        id: `feed_low:${line.key}`,
        type: 'feed_low',
        title: `${line.label} is running low`,
        message: `${formatBags(Math.max(line.left, 0))} left${lasts}.`,
        link: '/inventory',
        created_at: created,
      };
    });
}

function loggingNotification(activeBatches, loggedToday, today) {
  if (new Date().getHours() < NUDGE_HOUR) return [];
  const missing = activeBatches.filter((b) => !loggedToday.has(b.batchId));
  if (missing.length === 0) return [];
  const names = missing.length === 1
    ? missing[0].name
    : `${missing[0].name} and ${missing.length - 1} other batch${missing.length - 1 === 1 ? '' : 'es'}`;
  return [{
    id: `logging_reminder:${today}`,
    type: 'logging_reminder',
    title: 'Nothing recorded today',
    message: `No feed, eggs or bird losses logged yet for ${names}. A quick entry keeps your totals right.`,
    link: missing.length === 1 ? `/batches/${missing[0].batchId}` : '/batches',
    created_at: at(today, NUDGE_HOUR),
  }];
}

function withdrawalNotifications(batchNames, today) {
  return loadSupplements()
    .filter((s) => Number(s.withdrawalDays) > 0)
    .map((s) => {
      const days = supplementDates(s);
      const safeDate = addDays(days[days.length - 1] || s.date, Number(s.withdrawalDays) + 1);
      return { s, safeDate };
    })
    .filter(({ safeDate }) => safeDate <= today && daysBetween(safeDate, today) <= WITHDRAWAL_NEWS_DAYS)
    .map(({ s, safeDate }) => {
      const batchName = s.batchName || batchNames[s.batchId] || 'Batch';
      const what = findSupplementType(s.type)?.label.toLowerCase() || 'treatment';
      return {
        id: `withdrawal_ended:${s.id}`,
        type: 'withdrawal_ended',
        title: `${batchName}: withdrawal period over`,
        message: `Eggs and meat are safe to sell again after ${s.product || 'the'} ${what}.`,
        link: s.batchId ? `/batches/${s.batchId}` : '/inventory',
        created_at: at(safeDate),
      };
    });
}

/** When an entry was made: its server timestamp, else midday on its date. */
function entryTime(entry) {
  return entry.createdAt || (entry.date ? at(entry.date, 12) : new Date().toISOString());
}

function batchCompletedNotifications(batches, today) {
  return batches
    .filter((b) => b.status === 'closed' && b.closedAt)
    .filter((b) => daysBetween(b.closedAt.slice(0, 10), today) <= BATCH_COMPLETED_DAYS)
    .map((b) => ({
      id: `batch_completed:${b.batchId}`,
      type: 'batch_completed',
      title: 'Batch Completed',
      message: `${b.name} has been closed. Its full record and summary are in History.`,
      link: `/history/${b.batchId}`,
      created_at: notAfterNow(b.closedAt),
    }));
}

function birdLostNotifications(batch, mortality, today) {
  return mortality
    .filter((m) => m.date && daysBetween(m.date, today) <= BIRD_LOSS_DAYS && Number(m.count) > 0)
    .map((m) => {
      const count = Number(m.count);
      return {
        id: `bird_lost:${m.entryId || `${batch.batchId}-${m.date}`}`,
        type: 'bird_lost',
        title: 'Bird Lost Record',
        message: `${count} bird${count === 1 ? '' : 's'} recorded lost in ${batch.name}${m.note ? ` — ${m.note}` : ''}.`,
        link: `/batches/${batch.batchId}`,
        created_at: notAfterNow(entryTime(m)),
      };
    });
}

function feedLoggedNotifications(batch, feed, today) {
  return feed
    .filter((f) => f.date && daysBetween(f.date, today) <= FEED_LOGGED_DAYS)
    .map((f) => ({
      id: `feed_logged:${f.entryId || `${batch.batchId}-${f.date}`}`,
      type: 'feed_logged',
      title: 'Feed Logged',
      message: `${formatBags(feedBags(f))} of ${[f.feedType, f.brand].filter(Boolean).join(' · ') || 'feed'} recorded for ${batch.name}.`,
      link: `/batches/${batch.batchId}`,
      created_at: notAfterNow(entryTime(f)),
    }));
}

function supplementNotifications(batchNames, today) {
  return loadSupplements()
    .filter((s) => s.date && s.date <= today && daysBetween(s.date, today) <= SUPPLEMENT_DAYS)
    .map((s) => {
      const what = findSupplementType(s.type)?.label || 'Vitamin';
      const batchName = s.batchName || batchNames[s.batchId] || 'a batch';
      return {
        id: `supplement_added:${s.id}`,
        type: 'supplement_added',
        title: `${what} Added`,
        message: `${s.product || what} started for ${batchName}${Number(s.durationDays) > 1 ? ` (${s.durationDays} days)` : ''}.`,
        link: s.batchId ? `/batches/${s.batchId}` : '/inventory',
        created_at: notAfterNow(at(s.date, 9)),
      };
    });
}

// ---- read / deleted state (this device, per farm) -------------------------

function stateKey(farmId) {
  return `farmbook_notifications_${farmId || 'default'}`;
}

function readState(farmId) {
  try {
    const raw = JSON.parse(localStorage.getItem(stateKey(farmId)) || '{}');
    return { read: new Set(raw.read || []), deleted: new Set(raw.deleted || []) };
  } catch {
    return { read: new Set(), deleted: new Set() };
  }
}

function writeState(farmId, state) {
  // Oldest ids drop off first; Sets keep insertion order.
  const trim = (set) => [...set].slice(-MAX_REMEMBERED);
  try {
    localStorage.setItem(stateKey(farmId), JSON.stringify({ read: trim(state.read), deleted: trim(state.deleted) }));
  } catch {
    // Storage full or blocked — state still applies in memory this session.
  }
}

// ---- the source -----------------------------------------------------------

/** @type {NotificationSource} */
export const notificationSource = {
  async list({ farmId, batches }) {
    const today = toIso(new Date());
    const prefs = readPrefs();
    const active = batches.filter(isActive);
    const batchNames = Object.fromEntries(batches.map((b) => [b.batchId, b.name]));

    // Per batch: schedule, and today's feed / egg / loss entries. Two batches
    // at a time (4 requests each), not every batch at once: a burst of
    // requests can exceed the AWS account's Lambda concurrency limit, and
    // the extra ones come back as 503s.
    const perBatch = await inGroups(active, BATCHES_PER_GROUP, async (b) => {
      const [schedule, feed, eggs, mortality] = await Promise.all([
        safe(getSchedule(b.batchId).then((r) => r.schedule || []), null),
        safe(getLogs(b.batchId, 'feed').then((r) => r.logs || []), null),
        safe(getLogs(b.batchId, 'eggs').then((r) => r.logs || []), null),
        safe(getLogs(b.batchId, 'mortality').then((r) => r.logs || []), null),
      ]);
      return { batch: b, schedule, feed, eggs, mortality };
    });

    // If every request failed, the network or API is down — say so rather
    // than showing a misleading "all caught up".
    const anyLoaded = perBatch.some((p) => p.schedule || p.feed || p.eggs || p.mortality);
    if (active.length > 0 && !anyLoaded) {
      throw new Error('Could not reach TrackFarm to check for notifications.');
    }

    const purchases = await safe(getFeedPurchases(), []);
    const usage = perBatch.flatMap((p) => p.feed || []);

    const loggedToday = new Set(
      perBatch
        .filter((p) => [p.feed, p.eggs, p.mortality].some((list) => (list || []).some((e) => e.date === today)))
        .map((p) => p.batch.batchId)
    );
    // Don't nag about a batch whose logs failed to load.
    const checkable = perBatch.filter((p) => p.feed && p.eggs && p.mortality).map((p) => p.batch);

    const built = [
      ...(prefs.vaccinationReminders !== false
        ? perBatch.flatMap((p) => vaccinationNotifications(p.batch, p.schedule || [], today))
        : []),
      ...(prefs.feedAlerts !== false ? feedNotifications(purchases, usage) : []),
      ...(prefs.loggingNudges !== false ? loggingNotification(checkable, loggedToday, today) : []),
      ...(prefs.medicationAlerts !== false ? withdrawalNotifications(batchNames, today) : []),
      ...batchCompletedNotifications(batches, today),
      ...(prefs.activityLogs !== false
        ? [
            ...perBatch.flatMap((p) => birdLostNotifications(p.batch, p.mortality || [], today)),
            ...perBatch.flatMap((p) => feedLoggedNotifications(p.batch, p.feed || [], today)),
          ]
        : []),
      ...(prefs.medicationAlerts !== false ? supplementNotifications(batchNames, today) : []),
      ...readLocalEvents(farmId),
    ];

    const { read, deleted } = readState(farmId);
    return built
      .filter((n) => !deleted.has(n.id))
      .map((n) => ({ ...n, category: notificationMeta(n.type).category, read: read.has(n.id) }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async markRead({ farmId }, ids) {
    const state = readState(farmId);
    ids.forEach((id) => state.read.add(id));
    writeState(farmId, state);
  },

  async remove({ farmId }, ids) {
    const state = readState(farmId);
    ids.forEach((id) => state.deleted.add(id));
    writeState(farmId, state);
  },
};
