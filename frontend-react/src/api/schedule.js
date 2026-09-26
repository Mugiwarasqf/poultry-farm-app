import { api } from './client';

export function getSchedule(batchId) {
  return api('GET', `/batches/${batchId}/vaccination-schedule`);
}

export function createScheduleItem(batchId, { vaccineName, dueDate }) {
  return api('POST', `/batches/${batchId}/vaccination-schedule`, { vaccineName, dueDate });
}

export function updateScheduleItem(batchId, scheduleId, { status }) {
  return api('PATCH', `/batches/${batchId}/vaccination-schedule/${scheduleId}`, { status });
}

// Aliases used by CreateBatchPage, BatchDetailPage, InventoryPage
export function createSchedule(batchId, data) {
  return api('POST', `/batches/${batchId}/vaccination-schedule`, data);
}

export function updateSchedule(batchId, scheduleId, data) {
  return api('PATCH', `/batches/${batchId}/vaccination-schedule/${scheduleId}`, data);
}
