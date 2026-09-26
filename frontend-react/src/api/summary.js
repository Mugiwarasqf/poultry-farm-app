import { api } from './client';

export function getSummary(farmId, period = 'week') {
  return api('GET', `/farms/${farmId}/summary?period=${period}`);
}
