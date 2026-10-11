import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  CircleMinus,
  CirclePlus,
  PackagePlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBatches } from '../context/BatchContext';
import { LOGS_CHANGED_EVENT, getLogs } from '../api/logs';
import { getSchedule } from '../api/schedule';
import { getVaccinationRecords } from '../api/vaccinations';
import { VaccinationModal } from '../components/ui/VaccinationModal';
import { SupplementModal } from '../components/ui/SupplementModal';
import { CalendarPicker } from '../components/ui/CalendarPicker';
import { buildHealthEvents } from '../lib/healthEvents';
import { ROUTES } from '../lib/vaccines';
import { loadSupplements, describeDose, findSupplementType, supplementDates, toIso } from '../lib/supplements';
import { PillIcon } from '../components/ui/PillIcon';
import { Skeleton, SkeletonRows } from '../components/ui/Skeleton';
import { FeedPurchaseModal } from '../components/ui/FeedPurchaseModal';
import { FeedUsageModal } from '../components/ui/FeedUsageModal';
import { useFeedStock } from '../lib/useFeedStock';
import { formatNaira } from '../lib/feeds';
import { eggCount, feedBags, formatBags, formatCrates, formatDate, laysEggs } from '../lib/batch';
import { VaccineIcon } from '../components/ui/VaccineIcon';
import { FeedIcon } from '../components/ui/FeedIcon';
import { EggIcon } from '../components/ui/EggIcon';
import { MoneyIcon } from '../components/ui/MoneyIcon';
import { InventoryIcon } from '../components/ui/InventoryIcon';
import { CalendarIcon } from '../components/ui/CalendarIcon';

function StatCard({ icon: Icon, label, value, hint, loading = false }) {
  return (
    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80" aria-busy={loading || undefined}>
      <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
        <Icon size={14} className="text-[#4D6600]" /> {label}
      </span>
      {loading ? (
        // Same height as the real number and hint, so nothing shifts when data lands.
        <>
          <Skeleton className="h-8 sm:h-9 w-24 mt-1" />
          <Skeleton className="h-3 w-20 mt-1.5" />
        </>
      ) : (
        <>
          <span className="text-2xl sm:text-3xl font-extrabold text-stone-950 mt-1 block">{value}</span>
          {hint && <span className="text-[11px] text-stone-500 mt-0.5 block">{hint}</span>}
        </>
      )}
    </div>
  );
}

/** Placeholder for a feed-store card while stock loads. */
function StockCardSkeleton() {
  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs flex flex-col gap-3" aria-hidden="true">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-7" />
        <Skeleton className="h-7" />
      </div>
      <Skeleton className="h-8 w-full rounded-xl" />
    </div>
  );
}

export function InventoryPage() {
  const { batches } = useBatches();

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'eggs' | 'vaccination' | 'multivitamins'
  const [loading, setLoading] = useState(true);

  // Aggregated data across all batches
  const feedStore = useFeedStock();
  const [allEggLogs, setAllEggLogs] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [allVaccRecords, setAllVaccRecords] = useState([]);
  const [supplements, setSupplements] = useState(() => loadSupplements());

  // Modal states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usagePreset, setUsagePreset] = useState('');
  const [showVacModal, setShowVacModal] = useState(false);
  const [vacPrefill, setVacPrefill] = useState(null);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => toIso(new Date()));

  // Load eggs and vaccinations across all batches (feed comes from useFeedStock).
  // Only the first load shows skeletons; later refreshes (a log saved
  // elsewhere, the tab coming back into view) swap the numbers in place.
  // A request counter drops responses from refreshes that were overtaken.
  const loadSeq = useRef(0);
  const loadedOnce = useRef(false);
  const loadAllInventory = useCallback(async () => {
    const seq = ++loadSeq.current;
    const isCurrent = () => seq === loadSeq.current;
    if (batches.length === 0) {
      setLoading(false);
      return;
    }
    if (!loadedOnce.current) setLoading(true);
    try {
      const schedPromises = batches.map(async b => {
        try {
          const res = await getSchedule(b.batchId);
          return (res.schedule || []).map(s => ({ ...s, batchName: b.name }));
        } catch {
          return [];
        }
      });

      // Every egg a layer batch records counts toward the farm's egg stock.
      const eggPromises = batches.filter(b => laysEggs(b.type)).map(async b => {
        try {
          const res = await getLogs(b.batchId, 'eggs');
          return (res.logs || []).map(log => ({ ...log, batchId: b.batchId, batchName: b.name }));
        } catch {
          return [];
        }
      });

      const recordPromises = batches.map(async b => {
        try {
          const res = await getVaccinationRecords(b.batchId);
          return (res.logs || []).map(r => ({ ...r, batchId: b.batchId, batchName: b.name }));
        } catch {
          return [];
        }
      });

      const [schedsNested, eggsNested, recordsNested] = await Promise.all([
        Promise.all(schedPromises),
        Promise.all(eggPromises),
        Promise.all(recordPromises),
      ]);

      if (isCurrent()) {
        const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '');
        const flatScheds = schedsNested.flat().sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
        setAllEggLogs(eggsNested.flat().sort(byDateDesc));
        setAllSchedules(flatScheds);
        setAllVaccRecords(recordsNested.flat());
        loadedOnce.current = true;
      }
    } catch (err) {
      console.error('Inventory aggregate load error:', err);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [batches]);

  useEffect(() => {
    loadAllInventory();
    // Bumping the counter on unmount drops any response still in flight.
    return () => { loadSeq.current += 1; };
  }, [loadAllInventory]);

  // Refresh when a log is saved anywhere in the app, or when the farmer
  // comes back to this tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadAllInventory();
    };
    window.addEventListener(LOGS_CHANGED_EVENT, loadAllInventory);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(LOGS_CHANGED_EVENT, loadAllInventory);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadAllInventory]);

  const today = toIso(new Date());
  const thisMonth = today.slice(0, 7);
  const batchNames = Object.fromEntries(batches.map(b => [b.batchId, b.name]));

  // Feed store: purchases in, batch usage out.
  const { lines: stockLines } = feedStore.stock;
  // First load only: later background refreshes keep showing the real numbers.
  const feedLoading = feedStore.loading && feedStore.purchases.length === 0 && feedStore.usage.length === 0;
  const bagsInStore = stockLines.reduce((sum, l) => sum + Math.max(l.left, 0), 0);
  const storeValue = stockLines.reduce((sum, l) => sum + l.value, 0);
  const lowLines = stockLines.filter(l => l.status !== 'ok');
  const bagsUsedThisMonth = feedStore.usage
    .filter(u => (u.date || '').startsWith(thisMonth))
    .reduce((sum, u) => sum + feedBags(u), 0);
  const boughtThisMonth = feedStore.purchases.filter(p => (p.date || '').startsWith(thisMonth));
  const bagsBoughtThisMonth = boughtThisMonth.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
  const spentThisMonth = boughtThisMonth.reduce((sum, p) => sum + (Number(p.bags) || 0) * (Number(p.pricePerBagNaira) || 0), 0);
  const feedActivity = [
    ...feedStore.purchases.map(p => ({
      key: `in-${p.entryId}`,
      kind: 'in',
      date: p.date,
      feed: [p.feedType, p.brand].filter(Boolean).join(' · '),
      who: p.supplier ? `Bought from ${p.supplier}` : 'Bought',
      bags: Number(p.bags) || 0,
      amount: (Number(p.bags) || 0) * (Number(p.pricePerBagNaira) || 0),
    })),
    ...feedStore.usage.map((u, i) => ({
      key: `out-${u.entryId || i}`,
      kind: 'out',
      date: u.date,
      feed: [u.feedType, u.brand].filter(Boolean).join(' · ') || 'Feed',
      who: u.batchName || batchNames[u.batchId] || 'Batch',
      bags: feedBags(u),
      amount: Number(u.costNaira) || 0,
    })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Egg inventory — every egg a layer batch records is added here. Egg sales
  // aren't tracked yet, so this is the total collected, not what's left.
  const totalEggsStocked = allEggLogs.reduce((sum, log) => sum + eggCount(log), 0);
  const eggsThisMonth = allEggLogs
    .filter(log => (log.date || '').startsWith(thisMonth))
    .reduce((sum, log) => sum + eggCount(log), 0);
  const eggsToday = allEggLogs
    .filter(log => log.date === today)
    .reduce((sum, log) => sum + eggCount(log), 0);
  const eggsByBatch = batches
    .filter(b => laysEggs(b.type))
    .map(b => ({
      batchId: b.batchId,
      name: b.name,
      eggs: allEggLogs.filter(log => log.batchId === b.batchId).reduce((sum, log) => sum + eggCount(log), 0),
    }));

  // Vaccination: schedules are the plan, records are what was actually given.
  const upcomingVaccines = allSchedules.filter(s => s.status === 'upcoming' && s.dueDate >= today);
  const overdueVaccines = allSchedules.filter(s => (s.status === 'upcoming' && s.dueDate < today) || s.status === 'missed');
  const dueVaccines = [...overdueVaccines, ...upcomingVaccines];
  const linkedScheduleIds = new Set(allVaccRecords.map(r => r.scheduleId).filter(Boolean));

  // History = recorded vaccinations, plus schedules marked done before
  // recording existed (those have no record to show instead).
  const vaccinationHistory = [
    ...allVaccRecords.map(r => ({
      key: `r-${r.entryId}`,
      date: r.dateAdministered,
      batchName: r.batchName,
      vaccineName: r.vaccineName,
      doseNumber: r.doseNumber,
      route: r.route,
      birds: r.birdsVaccinated,
      administeredBy: r.administeredBy,
    })),
    ...allSchedules
      .filter(s => s.status === 'done' && !linkedScheduleIds.has(s.scheduleId))
      .map(s => ({
        key: `s-${s.scheduleId}`,
        date: s.dueDate,
        batchName: s.batchName,
        vaccineName: s.vaccineName,
        doseNumber: s.doseNumber,
        route: s.route,
      })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const givenThisMonth = vaccinationHistory.filter(v => (v.date || '').startsWith(thisMonth)).length;

  // Supplements
  const activeSupplements = supplements.filter(s => supplementDates(s).includes(today));
  const supplementsThisMonth = supplements.filter(s => (s.date || '').startsWith(thisMonth)).length;
  const withdrawalActive = supplements
    .filter(s => s.withdrawalDays > 0)
    .filter(s => {
      const days = supplementDates(s);
      const last = new Date((days[days.length - 1] || s.date) + 'T00:00:00');
      last.setDate(last.getDate() + Number(s.withdrawalDays));
      return toIso(last) >= today;
    })
    .map(s => ({ ...s, batchName: s.batchName || batchNames[s.batchId] || 'Batch' }));

  const healthEvents = buildHealthEvents({
    schedules: allSchedules,
    records: allVaccRecords,
    supplements,
    batchNames,
  });

  // Actions
  const openUsage = (presetKey = '') => {
    setUsagePreset(presetKey);
    setShowUsageModal(true);
  };

  const openVaccination = (prefill = null) => {
    setVacPrefill(prefill);
    setShowVacModal(true);
  };

  // Put what the vaccination form saved straight into the lists, so the
  // calendar and tables update without refetching every batch.
  const handleVaccinationSaved = ({ mode, item, batchId, scheduleId }) => {
    const batchName = batchNames[batchId] || 'Batch';
    if (mode === 'schedule') {
      setAllSchedules(prev =>
        [...prev, { ...item, batchId, batchName }].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      );
      return;
    }
    setAllVaccRecords(prev => [{ ...item, batchId, batchName }, ...prev]);
    const fulfilled = scheduleId || item?.scheduleId;
    if (fulfilled) {
      setAllSchedules(prev => prev.map(s => (s.scheduleId === fulfilled ? { ...s, status: 'done' } : s)));
    }
  };

  // Clicking a due vaccination on the calendar opens it ready to record.
  const handleEventClick = (event) => {
    if (event.kind !== 'vaccine' || event.status === 'done' || !event.source?.scheduleId) return;
    openVaccination({
      mode: 'record',
      batchId: event.batchId,
      vaccineName: event.title,
      doseNumber: event.source.doseNumber,
      scheduleId: event.source.scheduleId,
      date: today,
    });
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Header with Back Arrow matching reference image */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-2 rounded-full hover:bg-stone-100 text-stone-600 hover:text-stone-950 transition-colors"
          aria-label="Back to home"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-950 font-heading">
            Inventory
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Track feed stock, manage vaccination programs, and log farm supplements.
          </p>
        </div>
      </div>

      {/* Inventory Navigation Tabs */}
      <div className="flex items-center gap-0 border-b border-stone-200 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: 'feed', label: 'Feed' },
          { id: 'eggs', label: 'Eggs' },
          { id: 'vaccination', label: 'Vaccination' },
          { id: 'multivitamins', label: 'Vitamins' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#B7DA3E] text-[#4D6600]'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===================== TAB 1: FEED ===================== */}
      {activeTab === 'feed' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl text-[#4D6600] flex items-center justify-center shadow-2xs shrink-0">
                  <FeedIcon size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-950 font-heading">Feed Store</h3>
                  <p className="text-xs text-stone-500">Feed you bought, minus what your batches have used</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => openUsage()}
                  className="w-full sm:w-auto px-4 py-2.5 border border-[#D2EC7A] text-[#4D6600] hover:bg-[#F7FFE0] rounded-xl text-sm font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <CircleMinus size={16} /> Record Usage
                </button>
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <PackagePlus size={16} /> Add Feed Stock
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard loading={feedLoading} icon={InventoryIcon} label="Bags in store" value={formatBags(bagsInStore)} hint={lowLines.length ? `${lowLines.length} running low` : 'Stock levels OK'} />
              <StatCard loading={feedLoading} icon={MoneyIcon} label="Store value" value={formatNaira(storeValue)} hint="At the price you paid" />
              <StatCard loading={feedLoading} icon={CircleMinus} label="Used this month" value={formatBags(bagsUsedThisMonth)} />
              <StatCard loading={feedLoading} icon={CirclePlus} label="Bought this month" value={formatNaira(spentThisMonth)} hint={formatBags(bagsBoughtThisMonth)} />
            </div>
          </div>

          {/* One card per kind of feed in the store */}
          {feedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" role="status" aria-label="Loading the feed store">
              <StockCardSkeleton />
              <StockCardSkeleton />
              <StockCardSkeleton />
            </div>
          ) : feedStore.stock.lines.length === 0 ? (
            <div className="bg-white border border-dashed border-stone-300 rounded-3xl p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-stone-800">Your feed store is empty</p>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                {feedStore.error
                  ? 'The feed store could not be loaded. It needs the latest backend deployed.'
                  : 'Add the feed you buy here. When a batch records feed, it comes off this stock automatically.'}
              </p>
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="px-5 py-2.5 bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] rounded-xl text-sm font-bold cursor-pointer inline-flex items-center gap-2"
              >
                <PackagePlus size={16} /> Add Feed Stock
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {feedStore.stock.lines.map((line) => {
                const pct = line.bought ? Math.max(0, Math.min(100, (line.left / line.bought) * 100)) : 0;
                const badge = line.status === 'out'
                  ? { text: 'Out of stock', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
                  : line.status === 'low'
                  ? { text: 'Running low', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
                  : null;
                return (
                  <div key={line.key} className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-stone-950 truncate">{line.feedType}</div>
                        <div className="text-[11px] text-stone-500 truncate">
                          {[line.brand, `${line.bagSizeKg}kg bags`].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {badge && <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${badge.cls}`}>{badge.text}</span>}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl font-extrabold ${line.left <= 0 ? 'text-rose-600' : 'text-stone-950'}`}>
                          {Math.max(line.left, 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-stone-500">bag{line.left === 1 ? '' : 's'} left of {line.bought.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full transition-all ${line.status === 'out' ? 'bg-rose-500' : line.status === 'low' ? 'bg-amber-500' : 'bg-[#DFFF83]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-stone-400 block">Lasts about</span>
                        <span className="font-bold text-stone-800">
                          {line.left <= 0 ? '—' : line.daysLeft == null ? 'No recent use' : `${line.daysLeft} day${line.daysLeft === 1 ? '' : 's'}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Average price</span>
                        <span className="font-bold text-stone-800">{line.avgPrice ? `${formatNaira(line.avgPrice)}/bag` : '—'}</span>
                      </div>
                    </div>

                    {line.bestBefore && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                        Use before {formatDate(line.bestBefore)}
                      </div>
                    )}

                    <button
                      onClick={() => openUsage(line.key)}
                      disabled={line.left <= 0}
                      className="mt-auto w-full py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:border-[#D2EC7A] hover:text-[#4D6600] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Record usage from this feed
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Everything that went in and out */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-stone-950 font-heading">Feed Activity</h4>
            {feedLoading ? (
              <SkeletonRows rows={4} />
            ) : feedActivity.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-400 font-medium">No feed bought or used yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-200 text-stone-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 font-bold">Date</th>
                      <th className="py-3 font-bold">Feed</th>
                      <th className="py-3 font-bold hidden sm:table-cell">Batch / Supplier</th>
                      <th className="py-3 font-bold text-right">Bags</th>
                      <th className="py-3 font-bold text-right hidden sm:table-cell">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {feedActivity.slice(0, 20).map((row) => (
                      <tr key={row.key} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 text-stone-700 whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="py-3">
                          <div className="font-semibold text-stone-900">{row.feed}</div>
                          <div className="text-[11px] text-stone-400 sm:hidden">{row.who}</div>
                        </td>
                        <td className="py-3 text-stone-600 hidden sm:table-cell">{row.who}</td>
                        <td className={`py-3 text-right font-bold whitespace-nowrap ${row.kind === 'in' ? 'text-[#4D6600]' : 'text-stone-900'}`}>
                          {row.kind === 'in' ? '+' : '−'}{Math.round(row.bags * 100) / 100}
                        </td>
                        <td className="py-3 text-right text-stone-600 hidden sm:table-cell">{row.amount ? formatNaira(row.amount) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {feedStore.stock.untracked.length > 0 && (
              <p className="text-[11px] text-stone-400">
                {feedStore.stock.untracked.length} usage entr{feedStore.stock.untracked.length === 1 ? 'y was' : 'ies were'} recorded without matching feed in the store (for example, before the store existed), so they don't reduce the stock above.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB: EGGS ===================== */}
      {activeTab === 'eggs' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl  text-[#4D6600] flex items-center justify-center shadow-2xs shrink-0">
                <EggIcon size={22} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-950 font-heading">Egg Inventory</h3>
                <p className="text-xs text-stone-500">Every egg collection a layer batch records is added here automatically</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <StatCard
                loading={loading}
                icon={EggIcon}
                label="Eggs in Inventory"
                value={totalEggsStocked.toLocaleString()}
                hint={formatCrates(totalEggsStocked)}
              />
              <StatCard loading={loading} icon={CalendarIcon} label="Collected This Month" value={eggsThisMonth.toLocaleString()} hint={formatCrates(eggsThisMonth)} />
              <StatCard loading={loading} icon={Clock} label="Collected Today" value={eggsToday.toLocaleString()} hint={formatCrates(eggsToday)} />
            </div>

            {eggsByBatch.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-800 block">By batch</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eggsByBatch.map(b => (
                    <Link
                      key={b.batchId}
                      to={`/batches/${b.batchId}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-stone-200/80 hover:border-[#D2EC7A] hover:bg-[#F7FFE0]/40 transition-colors"
                    >
                      <span className="text-xs font-bold text-stone-900 truncate">{b.name}</span>
                      <span className="text-xs text-stone-600 shrink-0">
                        {loading ? <Skeleton className="h-3.5 w-16" /> : <><span className="font-extrabold text-stone-950">{b.eggs.toLocaleString()}</span> eggs</>}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-stone-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-stone-950 font-heading">Recent Egg Collections</h4>

            {loading ? (
              <SkeletonRows rows={4} />
            ) : allEggLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-400 font-medium">
                {eggsByBatch.length === 0
                  ? 'No layer batches yet. Eggs appear here once a layer batch records production.'
                  : 'No eggs recorded yet. Log eggs from a layer batch and they will be added here.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-200 text-stone-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 font-bold">Date</th>
                      <th className="py-3 font-bold">Batch</th>
                      <th className="py-3 font-bold">Crates</th>
                      <th className="py-3 font-bold">Loose</th>
                      <th className="py-3 font-bold text-right">Total Eggs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {allEggLogs.slice(0, 15).map((log, idx) => (
                      <tr key={log.entryId || idx} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 text-stone-900 font-semibold">{formatDate(log.date)}</td>
                        <td className="py-3.5 text-stone-700">{log.batchName}</td>
                        <td className="py-3.5 text-stone-700">{Number(log.crates) || 0}</td>
                        <td className="py-3.5 text-stone-700">{Number(log.looseEggs) || 0}</td>
                        <td className="py-3.5 font-bold text-stone-950 text-right">{eggCount(log).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: VACCINATION ===================== */}
      {activeTab === 'vaccination' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-950 font-heading">Vaccination</h3>
                <p className="text-xs text-stone-500 mt-0.5">Schedule upcoming vaccines and keep a record of every one given.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => openVaccination({ mode: 'record' })}
                  className="w-full sm:w-auto px-4 py-2.5 border border-[#D2EC7A] text-[#4D6600] hover:bg-[#F7FFE0] rounded-xl text-sm font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <ClipboardCheck size={16} /> Record Given
                </button>
                <button
                  onClick={() => openVaccination({ mode: 'schedule' })}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Schedule Vaccination
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#F7FFE0]/70 border border-[#E3F5A8]">
                <span className="text-xs font-bold text-[#3A4D00] flex items-center gap-1.5">
                  <CalendarIcon size={15} className="text-[#4D6600]" /> Upcoming
                </span>
                {loading ? <Skeleton className="h-8 sm:h-9 w-12 mt-1" /> : <span className="text-2xl sm:text-3xl font-extrabold text-[#3A4D00] mt-1 block">{upcomingVaccines.length}</span>}
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/70">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-rose-600" /> Overdue
                </span>
                {loading ? <Skeleton className="h-8 sm:h-9 w-12 mt-1" /> : <span className="text-2xl sm:text-3xl font-extrabold text-rose-950 mt-1 block">{overdueVaccines.length}</span>}
              </div>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-stone-500" /> Given this month
                </span>
                {loading ? <Skeleton className="h-8 sm:h-9 w-12 mt-1" /> : <span className="text-2xl sm:text-3xl font-extrabold text-stone-950 mt-1 block">{givenThisMonth}</span>}
              </div>
            </div>
          </div>

          {/* Health calendar — every appointment in its date box */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-4 sm:p-6 shadow-xs">
            <CalendarPicker
              variant="full"
              value={calendarDate}
              onChange={setCalendarDate}
              events={healthEvents}
              onEventClick={handleEventClick}
              agendaActions={(date) => (
                <>
                  <button
                    type="button"
                    onClick={() => openVaccination({ mode: date > today ? 'schedule' : 'record', date })}
                    className="px-2.5 h-7 rounded-lg bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <VaccineIcon size={12} /> Vaccine
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMultiModal(true)}
                    className="px-2.5 h-7 rounded-lg border border-stone-200 hover:border-[#D2EC7A] text-stone-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Vitamin
                  </button>
                </>
              )}
            />
          </div>

          {/* Due and overdue */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-stone-950 font-heading">Due Vaccinations</h4>
            {loading ? (
              <SkeletonRows rows={2} />
            ) : dueVaccines.length === 0 ? (
              <p className="py-4 text-center text-xs text-stone-400 font-medium">
                Nothing scheduled. Use "Schedule Vaccination" to plan the next one.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {dueVaccines.map((item) => {
                  const overdue = item.dueDate < today;
                  return (
                    <li key={item.scheduleId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-stone-900 break-words">
                          {item.vaccineName}
                          {item.doseNumber && <span className="font-medium text-stone-500"> · {item.doseNumber}</span>}
                        </div>
                        <div className="text-xs text-stone-500">
                          {item.batchName} · {ROUTES[item.route]?.label ? `${ROUTES[item.route].label} · ` : ''}
                          <span className={overdue ? 'text-rose-600 font-semibold' : ''}>
                            {overdue ? 'Overdue since ' : 'Due '}{formatDate(item.dueDate)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => openVaccination({
                          mode: 'record',
                          batchId: item.batchId,
                          vaccineName: item.vaccineName,
                          doseNumber: item.doseNumber,
                          scheduleId: item.scheduleId,
                          date: today,
                        })}
                        className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold border border-[#D2EC7A] text-[#4D6600] hover:bg-[#F7FFE0] transition-colors cursor-pointer shrink-0"
                      >
                        Record as given
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* History */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-stone-950 font-heading">Vaccination History</h4>
            {loading ? (
              <SkeletonRows rows={3} />
            ) : vaccinationHistory.length === 0 ? (
              <p className="py-4 text-center text-xs text-stone-400 font-medium">
                No vaccinations recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-200 text-stone-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 font-bold">Date</th>
                      <th className="py-3 font-bold">Batch</th>
                      <th className="py-3 font-bold">Vaccine</th>
                      <th className="py-3 font-bold hidden sm:table-cell">Method</th>
                      <th className="py-3 font-bold hidden sm:table-cell">Birds</th>
                      <th className="py-3 font-bold hidden md:table-cell">Given by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {vaccinationHistory.map((r) => (
                      <tr key={r.key} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 text-stone-700 whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="py-3 font-semibold text-stone-900">{r.batchName}</td>
                        <td className="py-3 font-bold text-stone-950">
                          {r.vaccineName}
                          {r.doseNumber && <span className="font-medium text-stone-500"> · {r.doseNumber}</span>}
                        </td>
                        <td className="py-3 text-stone-600 hidden sm:table-cell">{ROUTES[r.route]?.label || '—'}</td>
                        <td className="py-3 text-stone-600 hidden sm:table-cell">{r.birds ? Number(r.birds).toLocaleString() : '—'}</td>
                        <td className="py-3 text-stone-600 hidden md:table-cell">{r.administeredBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 3: VITAMINS & SUPPLEMENTS ===================== */}
      {activeTab === 'multivitamins' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl  text-[#4D6600] flex items-center justify-center shadow-2xs shrink-0">
                  <PillIcon size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-950 font-heading">Vitamins &amp; Supplements</h3>
                  <p className="text-xs text-stone-500">Multivitamins, anti-stress, calcium, dewormers and more</p>
                </div>
              </div>
              <button
                onClick={() => setShowMultiModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Record Vitamin
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={Clock} label="Running now" value={activeSupplements.length} hint={activeSupplements.map(s => s.product).slice(0, 3).join(', ') || 'No course running today'} />
              <StatCard icon={CalendarIcon} label="Given this month" value={supplementsThisMonth} />
              <StatCard
                icon={AlertTriangle}
                label="Withdrawal in force"
                value={withdrawalActive.length}
                hint={withdrawalActive.length ? `Don't sell eggs/meat from: ${withdrawalActive.map(w => w.batchName).join(', ')}` : 'All batches clear'}
              />
            </div>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-stone-950 font-heading">Recent Records</h4>
              <span className="text-[11px] text-stone-400">Saved on this device only</span>
            </div>
            {supplements.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-400 font-medium">
                No vitamins or supplements recorded yet. Click "Record Vitamin" to add one.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-200 text-stone-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 font-bold">Started</th>
                      <th className="py-3 font-bold">Batch</th>
                      <th className="py-3 font-bold">Product</th>
                      <th className="py-3 font-bold hidden sm:table-cell">Dose</th>
                      <th className="py-3 font-bold hidden md:table-cell">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {supplements.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-50/60 transition-colors align-top">
                        <td className="py-3 text-stone-700 whitespace-nowrap">{formatDate(s.date)}</td>
                        <td className="py-3 text-stone-700">{s.batchName || batchNames[s.batchId] || '—'}</td>
                        <td className="py-3">
                          <div className="font-bold text-stone-950">{s.product}</div>
                          <div className="text-[11px] text-stone-500">{findSupplementType(s.type)?.label || 'Supplement'}</div>
                          {s.withdrawalDays > 0 && (
                            <div className="text-[11px] text-amber-700 font-semibold">{s.withdrawalDays}-day withdrawal</div>
                          )}
                        </td>
                        <td className="py-3 text-stone-600 hidden sm:table-cell">{describeDose(s) || '—'}</td>
                        <td className="py-3 text-stone-500 hidden md:table-cell">{s.reason || s.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <FeedPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSaved={feedStore.addPurchase}
      />

      <FeedUsageModal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
        onSaved={feedStore.addUsage}
        presetKey={usagePreset}
        onAddStock={() => {
          setShowUsageModal(false);
          setShowPurchaseModal(true);
        }}
      />


      <VaccinationModal
        isOpen={showVacModal}
        onClose={() => setShowVacModal(false)}
        onSaved={handleVaccinationSaved}
        batches={batches}
        events={healthEvents}
        prefill={vacPrefill}
      />

      <SupplementModal
        isOpen={showMultiModal}
        onClose={() => setShowMultiModal(false)}
        onSaved={setSupplements}
        batches={batches}
        events={healthEvents}
      />
    </div>
  );
}

export default InventoryPage;
