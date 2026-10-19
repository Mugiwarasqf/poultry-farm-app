import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useBatches } from '../context/BatchContext';
import { BirdIcon } from '../components/ui/BirdIcon';
import { BatchHistoryDetail } from '../components/history/BatchHistoryDetail';
import { COMPLETED_PILL_CLASS, batchImage, formatDate, typePillClass, birdTypeLabel, typeFilterOptions } from '../lib/batch';
import { useIsDesktop } from '../lib/useMediaQuery';
import { CalendarIcon } from '../components/ui/CalendarIcon';
import { LocationIcon } from '../components/ui/LocationIcon';
import { HistoryIcon } from '../components/ui/HistoryIcon';

function BatchRow({ batch, selected, onSelect }) {
  const type = (batch.type || 'other').toLowerCase();

  return (
    <button
      type="button"
      onClick={() => onSelect(batch.batchId)}
      className={`w-full text-left bg-white dark:bg-[#1E2124] rounded-xl border p-4 flex items-center gap-4 transition-all cursor-pointer ${
        selected
          ? 'border-stone-900 dark:border-[#DFFF83] shadow-md'
          : 'border-transparent shadow-sm hover:shadow-md'
      }`}
    >
      <img
        src={batchImage(batch)}
        alt={batch.name}
        className="w-[72px] h-[72px] rounded-lg object-cover bg-stone-100 dark:bg-[#2B3238] shrink-0"
      />

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <span className="text-[15px] font-bold text-stone-950 dark:text-[#F5F7F5] font-heading truncate">
              {batch.name}
            </span>
            <span className={typePillClass(type)}>
              {birdTypeLabel(type)}
            </span>
          </div>
          <span className={`${COMPLETED_PILL_CLASS} shrink-0`}>
            Completed
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-[#94A3B8]">
          <CalendarIcon size={12} strokeWidth={3} className="text-stone-500 dark:text-[#94A3B8] shrink-0" />
          <span className="truncate">
            {formatDate(batch.startDate)} – {batch.closedAt ? formatDate(batch.closedAt) : 'Closed'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-[#94A3B8] flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <BirdIcon size={12} strokeWidth={3} className="text-black dark:text-[#F5F7F5] shrink-0" />
            {Number(batch.birdCount || 0).toLocaleString()} birds
          </span>
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <LocationIcon size={12} strokeWidth={3} className="text-black dark:text-[#F5F7F5] shrink-0" />
            <span className="truncate">{batch.housing || 'No house recorded'}</span>
          </span>
        </div>
      </div>

      <ChevronRight size={18} strokeWidth={2} className="text-stone-400 dark:text-[#64748B] shrink-0" />
    </button>
  );
}

export function HistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const { batches, loading } = useBatches();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  // Set when the mobile detail route hands a batch back on resize to desktop.
  const [selectedId, setSelectedId] = useState(location.state?.selectedBatchId || null);
  // "Back to History" on desktop closes the panel. Without this flag the
  // auto-select below would immediately re-open it, making the link a no-op.
  const [panelDismissed, setPanelDismissed] = useState(false);

  const closedBatches = useMemo(
    () => batches.filter((b) => b.status === 'closed'),
    [batches]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return closedBatches.filter((b) => {
      const matchesType = typeFilter === 'all' || (b.type || '').toLowerCase() === typeFilter;
      const matchesQuery = !q || (b.name || '').toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [closedBatches, query, typeFilter]);

  // On desktop the panel should never sit empty while rows are visible, and a
  // selection that's been filtered out has to give way to one that's showing.
  const firstId = filtered[0]?.batchId ?? null;
  const selectionVisible = filtered.some((b) => b.batchId === selectedId);
  useEffect(() => {
    if (!isDesktop || panelDismissed) return;
    if (!selectionVisible) setSelectedId(firstId);
  }, [isDesktop, panelDismissed, selectionVisible, firstId]);

  const selectedBatch = filtered.find((b) => b.batchId === selectedId) || null;

  const handleSelect = (batchId) => {
    if (isDesktop) {
      setPanelDismissed(false);
      setSelectedId(batchId);
    } else {
      navigate(`/history/${batchId}`);
    }
  };

  const handleClosePanel = () => {
    setPanelDismissed(true);
    setSelectedId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] gap-6 items-start">
      {/* Left column — heading, filters, list */}
      <div className="min-w-0 space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 dark:text-[#F5F7F5] font-heading">
            Batch History
          </h1>
          <p className="text-sm text-stone-500 dark:text-[#94A3B8] mt-2 max-w-xl leading-relaxed">
            View details and summary of your completed or closed batches. These batches are no
            longer active but you can still access their records and performance insights.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} strokeWidth={3} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search batches..."
              className="w-full bg-white dark:bg-[#1E2124] border border-stone-200 dark:border-[#2B3238] rounded-xl pl-10 pr-4 py-3 text-sm text-stone-900 dark:text-[#F5F7F5] placeholder:text-stone-400 dark:placeholder:text-[#64748B] shadow-xs focus:outline-hidden focus:border-[#B7DA3E] focus:ring-2 focus:ring-[#DFFF83]/70 transition-colors"
            />
          </div>

          <div className="relative shrink-0">
            <CalendarIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none stroke-[3] " />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter batches by type"
              className="appearance-none w-full sm:w-auto bg-white dark:bg-[#1E2124] border border-stone-200 dark:border-[#2B3238] rounded-xl pl-10 pr-10 py-3 text-sm font-medium text-stone-700 dark:text-[#F5F7F5] shadow-xs cursor-pointer focus:outline-hidden focus:border-[#B7DA3E] focus:ring-2 focus:ring-[#DFFF83]/70 transition-colors"
            >
              {typeFilterOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} strokeWidth={3} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-stone-950 dark:text-[#F5F7F5] font-heading">Completed Batches</h2>
          <span className="text-sm text-stone-500 dark:text-[#94A3B8] shrink-0">
            {filtered.length} {filtered.length === 1 ? 'batch' : 'batches'}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-stone-400">Loading batches…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white dark:bg-[#1E2124] rounded-xl shadow-sm">
            <div className="w-14 h-14 mx-auto bg-stone-100 dark:bg-[#2B3238] rounded-xl flex items-center justify-center mb-3">
              <HistoryIcon size={24} strokeWidth={2.5} className="text-stone-400 dark:text-[#64748B]" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-[#F5F7F5] font-heading mb-1">
              {closedBatches.length === 0 ? 'No completed batches yet' : 'No batches match your search'}
            </h3>
            <p className="text-sm text-stone-500 dark:text-[#94A3B8] max-w-sm mx-auto">
              {closedBatches.length === 0
                ? 'Once you close out a batch from the Batches page, it will show up here with its full summary.'
                : 'Try a different name or switch the type filter back to All Types.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((batch) => (
              <BatchRow
                key={batch.batchId}
                batch={batch}
                selected={isDesktop && batch.batchId === selectedId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right column — desktop detail panel. On smaller screens a row opens
          /history/:batchId as a full page instead, so this stays hidden. */}
      <div className="hidden lg:block">
        {selectedBatch ? (
          <BatchHistoryDetail batch={selectedBatch} onBack={handleClosePanel} />
        ) : (
          <div className="bg-white dark:bg-[#1E2124] rounded-xl shadow-sm p-10 text-center">
            <div className="w-14 h-14 mx-auto bg-stone-100 dark:bg-[#2B3238] rounded-xl flex items-center justify-center mb-3">
              <HistoryIcon size={24} strokeWidth={2.5} className="text-stone-400 dark:text-[#64748B]" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-[#F5F7F5] font-heading mb-1">
              Select a batch
            </h3>
            <p className="text-sm text-stone-500 dark:text-[#94A3B8]">
              Pick a completed batch on the left to see its full summary here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;
