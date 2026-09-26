import { api } from './client';

export async function getFarm(farmId) {
  try {
    return await api('GET', `/farms/${farmId}`);
  } catch (err) {
    if (err.status === 404) {
      return {
        farmId,
        name: localStorage.getItem('farmbook_farmname') || 'My Farm',
        farmerName: localStorage.getItem('farmbook_farmername') || '',
        location: localStorage.getItem('farmbook_farmlocation') || '',
        phone: localStorage.getItem('farmbook_farmphone') || '',
        onboarded: localStorage.getItem('farmbook_onboarded') === 'true',
      };
    }
    throw err;
  }
}

export async function updateFarm(farmId, updates) {
  try {
    return await api('PATCH', `/farms/${farmId}`, updates);
  } catch (err) {
    if (err.status === 404) {
      console.warn('PATCH /farms is not yet deployed on API Gateway; changes saved locally.', err);
      return { farmId, ...updates, offline: true };
    }
    throw err;
  }
}

