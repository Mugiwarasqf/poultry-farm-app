import { api } from './client';

export function getBatches() {
  return api('GET', '/batches');
}

/**
 * Sends everything the create form collected. The backend keeps only the
 * fields it knows (name, type, startDate, birdCount, breed, housing, penId,
 * hatchery, targetWeightKg, initialAgeWeeks, notes, purchaseCostNaira).
 * This used to send just the first four, silently dropping the rest.
 */
export function createBatch(batch) {
  return api('POST', '/batches', batch);
}

export function updateBatch(batchId, updates) {
  return api('PATCH', `/batches/${batchId}`, updates);
}

export function deleteBatch(batchId) {
  return api('DELETE', `/batches/${batchId}`);
}
