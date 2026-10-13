import { api, isNetworkError } from './client';
import { QUEUEABLE_RESOURCES, enqueueLogEntry, getPending } from '../lib/offlineQueue';

// Fired after any log entry is saved, so pages that aggregate logs across
// batches (Inventory) can refresh without a reload.
export const LOGS_CHANGED_EVENT = 'farmbook:logs-changed';

function notifyLogsChanged(resource, batchId) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LOGS_CHANGED_EVENT, { detail: { resource, batchId } }));
}

/**
 * Entries saved on this phone while offline that haven't been sent yet, shaped
 * like the server's own entries and marked `pending: true`, so every screen
 * shows them straight away. Parked ("failed") entries are left out: they are
 * not going to be saved, and the header's waiting-to-send button shows them.
 */
async function pendingEntries(batchId, resource) {
  if (!QUEUEABLE_RESOURCES.includes(resource)) return [];
  const queued = await getPending();
  return queued
    .filter((r) => r.batchId === batchId && r.resource === resource)
    .map((r) => ({ ...r.payload, entryId: r.entryId, batchId, createdAt: r.queuedAt, pending: true }));
}

/** The server's list plus anything still waiting to send; the server wins on the same entryId. */
async function listWithPending(batchId, resource) {
  let data;
  try {
    data = await api('GET', `/batches/${batchId}/${resource}`);
  } catch (err) {
    // Offline with no saved copy of this list: still show what was logged on
    // this phone, rather than nothing.
    const waiting = isNetworkError(err) ? await pendingEntries(batchId, resource) : [];
    if (waiting.length === 0) throw err;
    return { entries: waiting, logs: waiting };
  }
  const fromServer = data?.entries || data?.logs || (Array.isArray(data) ? data : []);
  const sent = new Set(fromServer.map((e) => e.entryId).filter(Boolean));
  const waiting = (await pendingEntries(batchId, resource)).filter((e) => !sent.has(e.entryId));
  const list = [...waiting, ...fromServer];
  return { ...data, entries: list, logs: list };
}

// Generic log resource calls — same shape for mortality, feed, eggs, vaccinations
export function getLogEntries(batchId, resource) {
  return listWithPending(batchId, resource);
}

/**
 * Create a log entry, falling back to the on-device queue when offline.
 *
 * Resolves with `queued: true` when the entry was stored locally instead of
 * sent, so callers can word their confirmation honestly ("saved on this phone,
 * it will send later") rather than implying it reached the server. If the
 * device has no usable IndexedDB the original error is rethrown, because
 * telling someone it was saved when it wasn't is the worst outcome.
 */
async function createWithQueueFallback(batchId, resource, data) {
  let result;
  try {
    result = await api('POST', `/batches/${batchId}/${resource}`, data);
  } catch (err) {
    if (!isNetworkError(err) || !QUEUEABLE_RESOURCES.includes(resource)) throw err;

    const record = await enqueueLogEntry({ resource, batchId, payload: data });
    if (!record) throw err;

    // Saved on the phone: pages showing logs reload and include it as pending.
    notifyLogsChanged(resource, batchId);
    return { ...data, batchId, entryId: record.entryId, createdAt: record.queuedAt, queued: true, pending: true };
  }
  notifyLogsChanged(resource, batchId);
  return result;
}

export function createLogEntry(batchId, resource, data) {
  return createWithQueueFallback(batchId, resource, data);
}

// Convenience aliases used by BatchDetailPage and InventoryPage
export function getLogs(batchId, logType) {
  return listWithPending(batchId, logType);
}

export function createLog(batchId, logType, data) {
  return createWithQueueFallback(batchId, logType, data);
}
