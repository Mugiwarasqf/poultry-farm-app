import { api } from './client';

/** Sick birds isolated from a batch — see backend/src/handlers/sickBay. */
export async function getSickBayCases(batchId) {
  const data = await api('GET', `/batches/${batchId}/sick-bay`);
  return data?.cases || [];
}

export function createSickBayCase(batchId, sickCase) {
  return api('POST', `/batches/${batchId}/sick-bay`, sickCase);
}

/** Close a case: { recoveredCount, diedCount, outcomeNotes? }. */
export function closeSickBayCase(batchId, caseId, outcome) {
  return api('PATCH', `/batches/${batchId}/sick-bay/${caseId}`, { ...outcome, status: 'closed' });
}
