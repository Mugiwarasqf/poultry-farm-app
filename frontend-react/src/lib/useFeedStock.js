import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBatches } from '../context/BatchContext';
import { getFeedPurchases } from '../api/feedStock';
import { getLogs } from '../api/logs';
import { computeFeedStock } from './feeds';

/**
 * The farm's feed store: purchases, every batch's usage, and the stock that
 * leaves. Stock is farm-wide, so even a single batch's page needs every
 * batch's usage to know what's left.
 *
 * `enabled` lets a modal load only when it opens.
 */
export function useFeedStock({ enabled = true } = {}) {
  const { batches } = useBatches();
  const [purchases, setPurchases] = useState([]);
  const [usage, setUsage] = useState([]);
  // Starts loading when enabled so the first render shows skeletons, not zeros.
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bought, used] = await Promise.all([
        getFeedPurchases().catch((err) => {
          // The store endpoint may not be deployed yet; usage still shows.
          setError(err);
          return [];
        }),
        Promise.all(
          batches.map((b) =>
            getLogs(b.batchId, 'feed')
              .then((res) => (res.logs || []).map((log) => ({ ...log, batchId: b.batchId, batchName: b.name })))
              .catch(() => [])
          )
        ).then((lists) => lists.flat()),
      ]);
      setPurchases(bought);
      setUsage(used.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    } finally {
      setLoading(false);
    }
  }, [batches]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const stock = useMemo(() => computeFeedStock(purchases, usage), [purchases, usage]);

  return {
    purchases,
    usage,
    stock,
    loading,
    error,
    reload: load,
    addPurchase: (p) => setPurchases((prev) => [p, ...prev]),
    addUsage: (u) => setUsage((prev) => [u, ...prev]),
  };
}
