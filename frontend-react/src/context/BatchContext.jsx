import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getBatches, createBatch as apiCreateBatch, updateBatch as apiUpdateBatch, deleteBatch as apiDeleteBatch } from '../api/batches';
import { useAuth } from './AuthContext';

const BatchContext = createContext(null);

export function BatchProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [batches, setBatches] = useState([]);
  const [currentBatchId, setCurrentBatchId] = useState(
    localStorage.getItem('farmbook_batchid') || null
  );
  // True from the start when already signed in, for the same reason as
  // farmLoading in AuthContext: otherwise the first render after a refresh
  // sees no batches, decides setup isn't done, and redirects the farmer away
  // from the page they were on.
  const [loading, setLoading] = useState(isLoggedIn);

  const loadBatches = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const data = await getBatches();
      const list = data.batches || [];
      setBatches(list);
      // Auto-select first batch if none selected
      if (!currentBatchId && list.length > 0) {
        setCurrentBatchId(list[0].batchId);
        localStorage.setItem('farmbook_batchid', list[0].batchId);
      }
    } catch (e) {
      console.error('Failed to load batches:', e);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, currentBatchId]);

  useEffect(() => {
    if (isLoggedIn) loadBatches();
  }, [isLoggedIn]);

  const selectBatch = useCallback((id) => {
    setCurrentBatchId(id);
    localStorage.setItem('farmbook_batchid', id);
  }, []);

  const createBatch = useCallback(async (batchData) => {
    const result = await apiCreateBatch(batchData);
    await loadBatches();
    if (result.batchId) {
      selectBatch(result.batchId);
    }
    return result;
  }, [loadBatches, selectBatch]);

  /**
   * PATCH a batch, then mirror the change locally. Closing a batch also
   * stamps closedAt here so the page updates straight away (the server sets
   * its own closedAt; the next load replaces this one).
   */
  const updateBatch = useCallback(async (batchId, updates) => {
    await apiUpdateBatch(batchId, updates);
    setBatches((prev) =>
      prev.map((b) => {
        if (b.batchId !== batchId) return b;
        const next = { ...b, ...updates };
        if (updates.status === 'closed') next.closedAt = new Date().toISOString();
        if (updates.status === 'active') delete next.closedAt;
        return next;
      })
    );
  }, []);

  const deleteBatch = useCallback(async (batchId) => {
    try {
      await apiDeleteBatch(batchId);
    } catch (err) {
      console.warn('API delete batch failed, proceeding with state cleanup:', err);
    }

    setBatches((prev) => {
      const filtered = prev.filter((b) => b.batchId !== batchId);
      if (currentBatchId === batchId) {
        const nextId = filtered.length > 0 ? filtered[0].batchId : null;
        setCurrentBatchId(nextId);
        if (nextId) {
          localStorage.setItem('farmbook_batchid', nextId);
        } else {
          localStorage.removeItem('farmbook_batchid');
        }
      }
      return filtered;
    });
  }, [currentBatchId]);

  const currentBatch = batches.find(b => b.batchId === currentBatchId) || null;
  const hasBatches = batches.length > 0;

  const value = {
    batches,
    currentBatchId,
    currentBatch,
    hasBatches,
    loading,
    selectBatch,
    createBatch,
    updateBatch,
    deleteBatch,
    loadBatches,
  };

  return <BatchContext.Provider value={value}>{children}</BatchContext.Provider>;
}

export function useBatches() {
  const ctx = useContext(BatchContext);
  if (!ctx) throw new Error('useBatches must be used within BatchProvider');
  return ctx;
}
