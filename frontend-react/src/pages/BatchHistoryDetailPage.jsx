import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useBatches } from '../context/BatchContext';
import { BatchHistoryDetail } from '../components/history/BatchHistoryDetail';
import { useIsDesktop } from '../lib/useMediaQuery';
import { HistoryIcon } from '../components/ui/HistoryIcon';

/**
 * Full-screen batch history detail — the small-screen counterpart to the side
 * panel on /history. If the viewport grows past the lg breakpoint while this
 * page is open, it hands the batch back to /history so the user lands on the
 * two-column layout with that same batch already selected, rather than being
 * stranded on a route the desktop layout never uses.
 */
export function BatchHistoryDetailPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { batches, loading } = useBatches();

  useEffect(() => {
    if (isDesktop) {
      navigate('/history', { replace: true, state: { selectedBatchId: batchId } });
    }
  }, [isDesktop, batchId, navigate]);

  const batch = batches.find((b) => b.batchId === batchId) || null;

  if (loading) {
    return <div className="py-16 text-center text-sm text-stone-400">Loading batch…</div>;
  }

  if (!batch) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="w-14 h-14 mx-auto bg-stone-100 rounded-xl flex items-center justify-center mb-3">
          <HistoryIcon size={24} className="text-stone-400" />
        </div>
        <h2 className="text-base font-bold text-stone-900 font-heading mb-1">Batch not found</h2>
        <p className="text-sm text-stone-500 mb-6">
          This batch may have been deleted, or it is no longer part of your history.
        </p>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#17191A] bg-[#DFFF83] hover:bg-[#C5E95A] transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span>Back to History</span>
        </button>
      </div>
    );
  }

  return <BatchHistoryDetail batch={batch} onBack={() => navigate('/history')} />;
}

export default BatchHistoryDetailPage;
