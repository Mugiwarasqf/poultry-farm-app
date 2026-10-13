import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getBatches, createBatch as apiCreateBatch, updateBatch as apiUpdateBatch, deleteBatch as apiDeleteBatch } from '../api/batches';
import { useAuth } from './AuthContext';

const BatchContext = createContext(null);
const ONLINE_RELOAD_GAP_MS = 30 * 1000;

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
  // Set when the last load failed (offline with nothing saved, or the API is
  // down). The list then means "unknown", not "no batches": screens must not
  // treat it as an empty farm (first-batch prompt, onboarding redirect).
  const [error, setError] = useState(null);
  // True once the first load after sign-in has finished (either way). Only
  // that first load may hold the whole app on the loading screen; later
  // reloads (after creating a batch, coming back online…) happen in place,
  // so the page underneath, and anything it's showing, stays mounted.
  const [ready, setReady] = useState(false);
  const lastLoadAt = useRef(0);

  const loadBatches = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    lastLoadAt.current = Date.now();
    try {
      const data = await getBatches();
      const list = data.batches || [];
      setBatches(list);
      setError(null);
      // Auto-select first batch if none selected
      if (!currentBatchId && list.length > 0) {
        setCurrentBatchId(list[0].batchId);
        localStorage.setItem('farmbook_batchid', list[0].batchId);
      }
    } catch (e) {
      // Keep whatever was already showing rather than wiping it.
      console.error('Failed to load batches:', e);
      setError(e);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [isLoggedIn, currentBatchId]);

  useEffect(() => {
    if (isLoggedIn) {
      loadBatches();
    } else {
      // Signed out: forget this farm's batches, and make the next sign-in
      // wait for its own first load.
      setBatches([]);
      setError(null);
      setReady(false);
    }
  }, [isLoggedIn]);

  // Back online: refresh. At most once every 30 seconds, so a connection that
  // keeps dropping doesn't flood the API (see the concurrency note in
  // lib/farmData.js).
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const onOnline = () => {
      if (Date.now() - lastLoadAt.current >= ONLINE_RELOAD_GAP_MS) loadBatches();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [isLoggedIn, loadBatches]);

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
    ready,
    error,
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
