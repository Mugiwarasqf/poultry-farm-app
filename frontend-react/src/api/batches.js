import { api } from './client';

export function getBatches() {
  return api('GET', '/batches');
}

export function createBatch({ name, type, startDate, birdCount }) {
  return api('POST', '/batches', { name, type, startDate, birdCount });
}

export function updateBatch(batchId, updates) {
  return api('PATCH', `/batches/${batchId}`, updates);
}

export function deleteBatch(batchId) {
  return api('DELETE', `/batches/${batchId}`);
}
