import { api } from './client';

/** Feed bought into the farm's store (farm-level; farmId comes from the token). */
export async function getFeedPurchases() {
  const data = await api('GET', '/feed-stock');
  return data?.purchases || [];
}

export function createFeedPurchase(purchase) {
  return api('POST', '/feed-stock', purchase);
}
