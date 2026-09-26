import { apiRaw } from './client';

export function syncBatch(rawBody) {
  return apiRaw('POST', '/sync/batch', rawBody);
}
