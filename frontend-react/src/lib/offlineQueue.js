import { syncBatch } from '../api/sync';

/**
 * On-device queue for log entries written while offline.
 *
 * SCOPE, deliberately narrow: only the four append-only log resources below.
 * Those replay safely because POST /sync/batch does a conditional put on a
 * client-generated entryId, so re-sending a line is a no-op rather than a
 * duplicate. Batch creates/edits/closes and profile updates are NOT queued —
 * replaying a stale mutation (closing a batch that was since reopened, or
 * logging against a deleted batch) produces wrong state, and the sync endpoint
 * was never built for them. Those still require a live connection.
 *
 * STORAGE: IndexedDB, not localStorage. The queue holds the farmer's only copy
 * of an entry until it lands, so it must not be evicted under storage pressure
 * or wiped alongside auth tokens. Keeping it out of localStorage also means
 * logout() and the 401 handler's clearTokens() cannot destroy pending work.
 */

const DB_NAME = 'farmbook';
const DB_VERSION = 1;
const STORE = 'pending_writes';

// Stop retrying a line the server keeps rejecting. A malformed or orphaned
// entry would otherwise retry forever on every reconnect. It is kept in the
// store rather than deleted, so nothing silently disappears.
const MAX_ATTEMPTS = 5;

// Flush in chunks so a long offline stretch can't build one oversized request
// against API Gateway, and so partial progress survives a mid-flush failure.
const FLUSH_CHUNK_SIZE = 50;

export const QUEUEABLE_RESOURCES = ['mortality', 'feed', 'eggs', 'vaccinations'];

/**
 * Confirmation shown when an entry went to the queue instead of the server.
 * Plain wording on purpose: it says where the record is and that nothing is
 * expected of the farmer, without using "sync", "cloud" or "offline".
 */
export const QUEUED_SAVE_MESSAGE = 'Saved on this phone. It will send by itself once you have network.';

const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A broken subscriber must not take down a flush.
    }
  }
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function newEntryId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'entryId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Runs `apply(store)` in a readwrite transaction and resolves when it commits. */
async function write(apply) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      apply(tx.objectStore(STORE));
    });
  } finally {
    db.close();
  }
}

/** Every queued record, including ones that have exhausted their retries. */
export async function getQueued() {
  let db;
  try {
    db = await openDb();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Private browsing or blocked storage — degrade to "nothing queued"
    // rather than breaking the page.
    return [];
  } finally {
    db?.close();
  }
}

/** Entries still waiting to send, excluding ones parked after repeated errors. */
export async function getPending() {
  const all = await getQueued();
  return all.filter((record) => !record.failed);
}

export async function getPendingCount() {
  return (await getPending()).length;
}

export async function getFailedCount() {
  const all = await getQueued();
  return all.filter((record) => record.failed).length;
}

/**
 * Persist one log entry for later delivery. Returns the stored record, or null
 * if the device has no usable IndexedDB — in which case the caller should
 * surface the original error rather than claim the entry was saved.
 */
export async function enqueueLogEntry({ resource, batchId, payload }) {
  if (!QUEUEABLE_RESOURCES.includes(resource) || !batchId) return null;

  const record = {
    entryId: newEntryId(),
    resource,
    batchId,
    payload: payload || {},
    queuedAt: new Date().toISOString(),
    attempts: 0,
    failed: false,
    lastError: null,
  };

  try {
    await write((store) => store.put(record));
  } catch {
    return null;
  }

  notify();
  return record;
}

async function deleteEntries(entryIds) {
  if (entryIds.length === 0) return;
  await write((store) => {
    for (const id of entryIds) store.delete(id);
  });
}

async function saveEntries(records) {
  if (records.length === 0) return;
  await write((store) => {
    for (const record of records) store.put(record);
  });
}

/** One queued record as a line the /sync/batch handler understands. */
function toSyncLine(record) {
  return JSON.stringify({
    ...record.payload,
    resource: record.resource,
    batchId: record.batchId,
    entryId: record.entryId,
  });
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

let flushInFlight = null;

/**
 * Send everything pending. Safe to call repeatedly — concurrent calls share
 * one in-flight run so a reconnect burst can't send the same lines twice.
 */
export function flushQueue() {
  if (flushInFlight) return flushInFlight;
  flushInFlight = runFlush().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

async function runFlush() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { skipped: true, applied: 0, remaining: await getPendingCount() };
  }

  const pending = await getPending();
  if (pending.length === 0) return { applied: 0, remaining: 0 };

  let applied = 0;
  let stopped = false;

  for (const batch of chunk(pending, FLUSH_CHUNK_SIZE)) {
    let response;
    try {
      response = await syncBatch(batch.map(toSyncLine).join('\n'));
    } catch (err) {
      // Network died again, or auth failed. Keep everything and retry later.
      stopped = true;
      break;
    }

    const results = response?.results;
    if (!Array.isArray(results)) {
      // Unrecognised response shape — assume nothing landed.
      stopped = true;
      break;
    }

    const deliveredIds = [];
    const retryRecords = [];

    for (const result of results) {
      const record = batch[result.line];
      if (!record) continue;

      // "duplicate" means a previous attempt already landed it — that's the
      // idempotency guarantee working, so it counts as delivered.
      if (result.status === 'applied' || result.status === 'duplicate') {
        deliveredIds.push(record.entryId);
        applied += 1;
      } else {
        const attempts = (record.attempts || 0) + 1;
        retryRecords.push({
          ...record,
          attempts,
          failed: attempts >= MAX_ATTEMPTS,
          lastError: result.reason || 'sync rejected',
        });
      }
    }

    await deleteEntries(deliveredIds);
    await saveEntries(retryRecords);
    notify();
  }

  return { applied, stopped, remaining: await getPendingCount() };
}
