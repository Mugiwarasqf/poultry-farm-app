import { api } from './client';
import { QUEUEABLE_RESOURCES, enqueueLogEntry } from '../lib/offlineQueue';

// Generic log resource calls — same shape for mortality, feed, eggs, vaccinations
export async function getLogEntries(batchId, resource) {
  const data = await api('GET', `/batches/${batchId}/${resource}`);
  const list = data?.entries || data?.logs || (Array.isArray(data) ? data : []);
  return { ...data, entries: list, logs: list };
}

/**
 * True only when the request never reached the server.
 *
 * This distinction is the whole safety of the queue. A 4xx means the server
 * looked at the entry and rejected it, so queueing it would just retry a
 * guaranteed failure forever. A fetch rejection means the write never left the
 * device and is worth keeping.
 */
function isNetworkError(err) {
  if (err?.status !== undefined) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return err instanceof TypeError;
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
  try {
    return await api('POST', `/batches/${batchId}/${resource}`, data);
  } catch (err) {
    if (!isNetworkError(err) || !QUEUEABLE_RESOURCES.includes(resource)) throw err;

    const record = await enqueueLogEntry({ resource, batchId, payload: data });
    if (!record) throw err;

    return { ...data, batchId, entryId: record.entryId, queued: true };
  }
}

export function createLogEntry(batchId, resource, data) {
  return createWithQueueFallback(batchId, resource, data);
}

// Convenience aliases used by BatchDetailPage and InventoryPage
export async function getLogs(batchId, logType) {
  const data = await api('GET', `/batches/${batchId}/${logType}`);
  const list = data?.entries || data?.logs || (Array.isArray(data) ? data : []);
  return { ...data, entries: list, logs: list };
}

export function createLog(batchId, logType, data) {
  return createWithQueueFallback(batchId, logType, data);
}
