import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Egg,
  Wheat,
  Activity,
  CheckCircle2,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  MapPin,
  ShoppingCart,
  Syringe,
  Percent,
  Scale,
  Package,
  FileText,
  Download,
  Flag,
  RotateCcw,
  Stethoscope,
} from 'lucide-react';
import { useBatches } from '../context/BatchContext';
import { useAuth } from '../context/AuthContext';
import { CompleteBatchModal } from '../components/ui/CompleteBatchModal';
import { SickBayTab } from '../components/sickbay/SickBayTab';
import { assessPerformance, RATING_STYLES } from '../lib/performance';
import { penForBatch } from '../lib/pens';
import { batchAgeWeeks } from '../lib/feeds';
import { getLogs, createLog } from '../api/logs';
import { QUEUED_SAVE_MESSAGE } from '../lib/offlineQueue';
import { getSchedule } from '../api/schedule';
import { getVaccinationRecords } from '../api/vaccinations';
import { SupplementModal } from '../components/ui/SupplementModal';
import { CalendarPicker } from '../components/ui/CalendarPicker';
import { buildHealthEvents } from '../lib/healthEvents';
import { ROUTES } from '../lib/vaccines';
import { loadSupplements, describeDose, findSupplementType, toIso } from '../lib/supplements';
import { Modal } from '../components/ui/Modal';
import { VaccinationModal } from '../components/ui/VaccinationModal';
import { DeleteBatchModal } from '../components/ui/DeleteBatchModal';
import { useToast } from '../components/ui/Toast';
import { PillIcon } from '../components/ui/PillIcon';
import { BirdIcon } from '../components/ui/BirdIcon';
import { EGGS_PER_CRATE, FEED_BAG_KG, batchAge, batchImage, computeFCR, daysActive, feedBags, formatBags, formatCrates, formatDate, typePillClass, birdTypeLabel, birdPurpose, laysEggs } from '../lib/batch';
import { downloadTableReport } from '../lib/report';
import { FeedUsageModal } from '../components/ui/FeedUsageModal';
import { FeedPurchaseModal } from '../components/ui/FeedPurchaseModal';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'logs', label: 'Daily Logs' },
  { id: 'feed', label: 'Feed Record' },
  { id: 'vaccines', label: 'Vaccination' },
  { id: 'multivitamins', label: 'Vitamins' },
  { id: 'sickbay', label: 'Sick Bay' },
  { id: 'mortality', label: 'Mortality' },
  { id: 'weight', label: 'Weight' },
];

function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="px-3 sm:px-5 first:pl-0 last:pr-0 min-w-0">
      <div className="flex items-center gap-1.5 sm:gap-2 text-stone-500">
        <Icon size={15} strokeWidth={2.5} className="text-stone-700 shrink-0" />
        <span className="text-[11px] sm:text-xs truncate">{label}</span>
      </div>
      <div className="text-lg sm:text-xl font-bold text-stone-950 font-heading mt-1 whitespace-nowrap">{value}</div>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, suffix, hint }) {
  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-2 text-stone-500">
        <Icon size={15} strokeWidth={2.5} className="text-stone-500 shrink-0" />
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-stone-950 font-heading">{value}</span>
        {suffix && <span className="text-xs text-stone-400">{suffix}</span>}
      </div>
      {hint && <div className="text-[11px] text-stone-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function InsightRow({ icon: Icon, label, sub, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
      <div className="flex items-start gap-2.5 min-w-0">
        <Icon size={15} strokeWidth={2.5} className="text-stone-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-xs text-stone-600 truncate">{label}</div>
          {sub && <div className="text-[11px] text-stone-400 truncate">{sub}</div>}
        </div>
      </div>
      <span className="text-sm font-semibold text-stone-900 shrink-0">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-6 flex items-center gap-4">
      <div className="w-11 h-11 rounded-full bg-white border border-stone-200 flex items-center justify-center shrink-0">
        <Icon size={18} strokeWidth={2.5} className="text-stone-400" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-stone-800">{title}</div>
        {description && <div className="text-xs text-stone-500 mt-0.5">{description}</div>}
      </div>
    </div>
  );
}

function LogRow({ icon: Icon, primary, secondary, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
            <Icon size={16} strokeWidth={2.5} className="text-stone-600" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-stone-900 truncate">{primary}</div>
          {secondary && <div className="text-xs text-stone-500 truncate mt-0.5">{secondary}</div>}
        </div>
      </div>
      {value && <span className="text-sm font-semibold text-stone-900 shrink-0">{value}</span>}
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-stone-200 p-4 flex flex-col items-center justify-center gap-2 text-center hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
    >
      <Icon size={20} strokeWidth={2.5} className="text-stone-800" />
      <span className="text-xs font-semibold text-stone-800 leading-tight">{label}</span>
    </button>
  );
}

export function BatchDetailPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { batches, selectBatch, deleteBatch, updateBatch } = useBatches();
  const { farm } = useAuth();
  const toast = useToast();

  const batch = batches.find(b => b.batchId === batchId) || null;

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  // Bumped by the "Isolate Birds" quick action to open the sick bay form.
  const [sickBaySignal, setSickBaySignal] = useState(0);

  // Batch specific logs state
  const [mortalityLogs, setMortalityLogs] = useState([]);
  const [feedLogs, setFeedLogs] = useState([]);
  const [eggLogs, setEggLogs] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [scheduleList, setScheduleList] = useState([]);
  const [vaccRecords, setVaccRecords] = useState([]);
  const [allSupplements, setAllSupplements] = useState(() => loadSupplements());
  const multivitaminLogs = allSupplements.filter((s) => s.batchId === batchId);
  const [vacPrefill, setVacPrefill] = useState(null);
  const [calendarDate, setCalendarDate] = useState(() => toIso(new Date()));

  // Modal states for logging
  const [logModal, setLogModal] = useState(null); // 'mortality' | 'feed' | 'eggs' | 'vaccine' | 'multivitamin'
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));

  // Form fields
  const [mortCount, setMortCount] = useState('');
  const [mortReason, setMortReason] = useState('');


  const [eggCrates, setEggCrates] = useState('');
  const [looseEggs, setLooseEggs] = useState('');

  const [avgWeightKg, setAvgWeightKg] = useState('');
  const [weightSampleSize, setWeightSampleSize] = useState('');

  useEffect(() => {
    if (!batchId) return;
    selectBatch(batchId);
    let cancelled = false;

    async function loadBatchData() {
      setLoading(true);
      try {
        const [mRes, fRes, sRes, eRes, vRes, wRes] = await Promise.all([
          getLogs(batchId, 'mortality').catch(() => ({ logs: [], entries: [] })),
          getLogs(batchId, 'feed').catch(() => ({ logs: [], entries: [] })),
          getSchedule(batchId).catch(() => ({ schedule: [] })),
          getLogs(batchId, 'eggs').catch(() => ({ logs: [], entries: [] })),
          getVaccinationRecords(batchId).catch(() => ({ logs: [] })),
          getLogs(batchId, 'weight').catch(() => ({ logs: [], entries: [] })),
        ]);

        if (!cancelled) {
          const mList = mRes?.logs || mRes?.entries || [];
          const fList = fRes?.logs || fRes?.entries || [];
          const eList = eRes?.logs || eRes?.entries || [];
          const wList = wRes?.logs || wRes?.entries || [];
          setMortalityLogs(mList);
          setFeedLogs(fList);
          setScheduleList(sRes?.schedule || []);
          setEggLogs(eList);
          setVaccRecords(vRes?.logs || []);
          setWeightLogs(wList);
        }
      } catch (err) {
        console.error('Error loading batch data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBatchData();
    return () => { cancelled = true; };
  }, [batchId, batch?.type, selectBatch]);

  if (!batch) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-stone-900 font-heading">Batch Not Found</h2>
        <p className="text-sm text-stone-500">The requested batch could not be found or has been removed.</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D5C3A] text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft size={16} /> Return to Home
        </Link>
      </div>
    );
  }

  const totalMortality = mortalityLogs.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const currentBirds = Math.max(0, (batch.birdCount || 0) - totalMortality);
  const totalFeedBags = feedLogs.reduce((acc, curr) => acc + feedBags(curr), 0);
  // null until there are 2+ weight samples to compute a gain from — see
  // lib/batch.js's computeFCR for why, and the approximation it makes.
  const fcr = computeFCR(feedLogs, weightLogs, currentBirds);

  // Weigh-ins oldest → newest, each with its change from the one before.
  const weightHistory = [...weightLogs]
    .filter((w) => w.date && Number(w.averageWeightKg) > 0)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || ''))
    .map((w, i, list) => ({
      ...w,
      change: i === 0 ? null : Number(w.averageWeightKg) - Number(list[i - 1].averageWeightKg),
    }));
  const firstWeight = weightHistory[0];
  const latestWeight = weightHistory[weightHistory.length - 1];
  const weightGain = weightHistory.length > 1 ? Number(latestWeight.averageWeightKg) - Number(firstWeight.averageWeightKg) : null;
  const formatKg = (kg) => `${Math.round(Number(kg) * 1000) / 1000} kg`;

  // Feed conversion ratio as shown everywhere on this page: the value, or
  // the actual reason it can't be worked out yet.
  const fcrValue = fcr != null ? `${fcr} : 1` : '-';
  const fcrNote =
    fcr != null
      ? 'kg of feed per kg of weight gained'
      : weightHistory.length < 2
      ? 'Log 2 weigh-ins in the Weight tab'
      : !(weightGain > 0)
      ? 'Birds have not gained weight between weigh-ins'
      : feedLogs.length === 0
      ? 'Record feed usage to work it out'
      : 'Not enough data yet';
  const formatChange = (kg) => `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${formatKg(Math.abs(kg))}`;

  // Handlers for logging
  const handleLogMortality = async (e) => {
    e.preventDefault();
    if (!mortCount || Number(mortCount) <= 0) return toast('Please enter count', 'error');
    try {
      const createdItem = await createLog(batchId, 'mortality', {
        date: logDate,
        count: Number(mortCount),
        note: mortReason.trim() || undefined,
      });
      // Queued entries can't be re-fetched — the server hasn't seen them and
      // the GET would fail too, landing us in the catch block and wrongly
      // telling the farmer the record was lost. Show the local copy instead.
      if (createdItem?.queued) {
        toast(QUEUED_SAVE_MESSAGE, 'success');
        setMortalityLogs([createdItem, ...mortalityLogs]);
      } else {
        toast('Mortality recorded', 'success');
        const res = await getLogs(batchId, 'mortality');
        const items = res?.logs || res?.entries || (createdItem ? [createdItem, ...mortalityLogs] : mortalityLogs);
        setMortalityLogs(items);
      }
      setMortCount('');
      setMortReason('');
      setLogModal(null);
    } catch (err) {
      toast(err.message || 'Failed to record mortality', 'error');
    }
  };

  const handleLogEggs = async (e) => {
    e.preventDefault();
    const batchType = (batch?.type || '').toLowerCase();
    if (!laysEggs(batchType)) return toast(`Egg logging isn't set up for ${birdTypeLabel(batchType)} batches`, 'error');
    if (!eggCrates && !looseEggs) return toast('Enter crates or loose eggs', 'error');
    try {
      const payload = {
        date: logDate,
        crates: Number(eggCrates) || 0,
        looseEggs: Number(looseEggs) || 0,
      };
      const createdItem = await createLog(batchId, 'eggs', payload);
      if (createdItem?.queued) {
        toast(QUEUED_SAVE_MESSAGE, 'success');
        setEggLogs([createdItem, ...eggLogs]);
      } else {
        toast('Egg production logged', 'success');
        const res = await getLogs(batchId, 'eggs');
        const items = res?.logs || res?.entries || (createdItem ? [createdItem, ...eggLogs] : eggLogs);
        setEggLogs(items);
      }
      setEggCrates('');
      setLooseEggs('');
      setLogModal(null);
    } catch (err) {
      toast(err.message || 'Failed to log eggs', 'error');
    }
  };

  const handleLogWeight = async (e) => {
    e.preventDefault();
    if (!avgWeightKg || Number(avgWeightKg) <= 0) return toast('Enter the average bird weight', 'error');
    try {
      const createdItem = await createLog(batchId, 'weight', {
        date: logDate,
        averageWeightKg: Number(avgWeightKg),
        sampleSize: weightSampleSize ? Number(weightSampleSize) : undefined,
      });
      if (createdItem?.queued) {
        toast(QUEUED_SAVE_MESSAGE, 'success');
        setWeightLogs([createdItem, ...weightLogs]);
      } else {
        toast('Weight sample recorded', 'success');
        const res = await getLogs(batchId, 'weight');
        const items = res?.logs || res?.entries || (createdItem ? [createdItem, ...weightLogs] : weightLogs);
        setWeightLogs(items);
      }
      setAvgWeightKg('');
      setWeightSampleSize('');
      setLogModal(null);
    } catch (err) {
      toast(err.message || 'Failed to record weight', 'error');
    }
  };

  const openVaccination = (prefill = null) => {
    setVacPrefill(prefill);
    setLogModal('vaccine');
  };

  // Put what the vaccination form saved straight into the lists.
  const handleVaccinationSaved = ({ mode, item, scheduleId }) => {
    if (mode === 'schedule') {
      setScheduleList((prev) => [...prev, item]);
      return;
    }
    setVaccRecords((prev) => [item, ...prev]);
    if (scheduleId) {
      setScheduleList((prev) => prev.map((s) => (s.scheduleId === scheduleId ? { ...s, status: 'done' } : s)));
    }
  };

  const recordScheduled = (item) =>
    openVaccination({
      mode: 'record',
      vaccineName: item.vaccineName,
      doseNumber: item.doseNumber,
      scheduleId: item.scheduleId,
      date: toIso(new Date()),
    });

  const handleDeleteBatch = async (id) => {
    await deleteBatch(id);
    toast(`Batch "${batch?.name || 'Batch'}" was permanently deleted.`, 'success');
    navigate('/dashboard');
  };

  const handleCompleteBatch = async (updates) => {
    await updateBatch(batchId, updates);
    toast(`${batch.name} is complete. You'll find it in History.`, 'success');
  };

  const handleReopen = async () => {
    try {
      await updateBatch(batchId, { status: 'active' });
      toast(`${batch.name} is active again`, 'success');
    } catch (err) {
      toast(err.message || 'Could not reopen the batch', 'error');
    }
  };

  // A sick-bay death is written to mortality; pull the list again so the
  // bird counts on this page update.
  const refreshMortality = async () => {
    try {
      const res = await getLogs(batchId, 'mortality');
      setMortalityLogs(res?.logs || res?.entries || []);
    } catch {
      // Next page load will pick it up.
    }
  };

  const batchType = (batch?.type || '').toLowerCase();
  const isLayer = laysEggs(batchType);
  const purpose = birdPurpose(batchType);
  const batchPen = penForBatch(batch, farm?.pens || []);

  const totalEggs = eggLogs.reduce((sum, e) => sum + (Number(e.crates) || 0) * EGGS_PER_CRATE + (Number(e.looseEggs) || 0), 0);
  const totalFeedCost = feedLogs.reduce((sum, e) => sum + (Number(e.costNaira) || 0), 0);
  const closedDays = daysActive(batch.startDate, batch.closedAt);
  const runningDays = batch.startDate
    ? Math.max(0, Math.round((Date.now() - new Date(batch.startDate)) / 86400000))
    : null;
  const activeDays = closedDays != null ? closedDays : runningDays;
  const lossPercent = batch.birdCount ? Math.round((totalMortality / batch.birdCount) * 1000) / 10 : null;
  const avgEggsPerDay = isLayer && activeDays ? Math.round(totalEggs / activeDays) : null;

  // Vaccination: the plan (schedule) and what was actually given (records).
  const todayIso = toIso(new Date());
  const linkedScheduleIds = new Set(vaccRecords.map((r) => r.scheduleId).filter(Boolean));
  const dueVaccines = scheduleList
    .filter((s) => s.status === 'upcoming' || s.status === 'missed')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  // History = records, plus schedules marked done before recording existed.
  const vaccinationHistory = [
    ...vaccRecords.map((r) => ({
      key: `r-${r.entryId}`,
      date: r.dateAdministered,
      vaccineName: r.vaccineName,
      doseNumber: r.doseNumber,
      route: r.route,
      birds: r.birdsVaccinated,
      administeredBy: r.administeredBy,
      lotNumber: r.lotNumber,
    })),
    ...scheduleList
      .filter((s) => s.status === 'done' && !linkedScheduleIds.has(s.scheduleId))
      .map((s) => ({ key: `s-${s.scheduleId}`, date: s.dueDate, vaccineName: s.vaccineName, doseNumber: s.doseNumber, route: s.route })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const doneVaccinations = vaccinationHistory.length;
  const healthEvents = buildHealthEvents({
    schedules: scheduleList.map((s) => ({ ...s, batchId })),
    records: vaccRecords.map((r) => ({ ...r, batchId })),
    supplements: multivitaminLogs,
  });

  // Best single day of egg collection, grouping entries logged on the same date.
  const eggsByDay = eggLogs.reduce((map, entry) => {
    if (!entry.date) return map;
    const eggs = (Number(entry.crates) || 0) * EGGS_PER_CRATE + (Number(entry.looseEggs) || 0);
    map.set(entry.date, (map.get(entry.date) || 0) + eggs);
    return map;
  }, new Map());
  const peakEggDay = eggsByDay.size > 0 ? Math.max(...eggsByDay.values()) : null;

  // Every log type merged for the Daily Logs tab, newest first.
  const dailyLogs = [
    ...feedLogs.map((e) => ({ date: e.date, kind: 'Feed logged', detail: `${e.feedType || 'Feed'} - ${formatBags(feedBags(e))}`, icon: Wheat })),
    ...mortalityLogs.map((e) => ({ date: e.date, kind: 'Mortality recorded', detail: `${Number(e.count) || 0} birds${e.note ? ` (${e.note})` : ''}`, icon: TrendingDown })),
    ...weightHistory.map((w) => ({ date: w.date, kind: 'Weight recorded', detail: `${formatKg(w.averageWeightKg)} average${w.sampleSize ? ` (${w.sampleSize} birds weighed)` : ''}`, icon: Scale })),
    ...eggLogs.map((e) => ({ date: e.date, kind: 'Eggs recorded', detail: `${Number(e.crates) || 0} crates, ${Number(e.looseEggs) || 0} loose`, icon: Egg })),
    ...multivitaminLogs.map((m) => ({ date: m.date, kind: `${findSupplementType(m.type)?.label || 'Vitamin'} given`, detail: [m.product, describeDose(m)].filter(Boolean).join(' - '), icon: PillIcon })),
    ...vaccinationHistory.map((v) => ({ date: v.date, kind: 'Vaccination given', detail: [v.vaccineName, v.doseNumber, ROUTES[v.route]?.label].filter(Boolean).join(' - '), icon: Syringe })),
    ...dueVaccines.map((s) => ({ date: s.dueDate, kind: 'Vaccination due', detail: [s.vaccineName, s.doseNumber].filter(Boolean).join(' - '), icon: Syringe })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const closed = batch.status === 'closed';

  // Performance, judged by what this bird type is raised for (lib/performance.js).
  const vaccineCost = vaccRecords.reduce((sum, r) => sum + (Number(r.costNaira) || 0), 0);
  const supplementCost = multivitaminLogs.reduce((sum, m) => sum + (Number(m.costNaira) || 0), 0);
  const costs = {
    birds: Number(batch.purchaseCostNaira) || 0,
    feed: totalFeedCost,
    vaccines: vaccineCost,
    supplements: supplementCost,
  };
  const performance = assessPerformance({
    purpose,
    batch,
    eggLogs,
    currentBirds,
    fcr,
    ageWeeks: batchAgeWeeks(batch),
    costs,
  });
  const ratingStyle = RATING_STYLES[performance.rating];
  const safeName = (batch.name || 'batch').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  // Each tab exports the rows it is showing, so the file always matches what
  // is on screen. `heading` is the title printed at the top of the PDF.
  const REPORTS = {
    overview: {
      title: 'Download Batch Report',
      subtitle: 'Get a complete summary of this batch',
      build: () => ({
        heading: 'Batch Summary',
        filename: safeName + '-summary.pdf',
        headers: ['Item', 'Value'],
        rows: [
          ['Batch', batch.name],
          ['Bird type', birdTypeLabel(batchType)],
          ['Status', closed ? 'Completed' : 'Active'],
          ['Started', formatDate(batch.startDate)],
          ['Closed', batch.closedAt ? formatDate(batch.closedAt) : '-'],
          ['Age', batchAge(batch)],
          ['Total birds placed', Number(batch.birdCount || 0).toLocaleString()],
          ['Birds remaining', currentBirds.toLocaleString()],
          ['Mortality', `${totalMortality.toLocaleString()} birds`],
          ['Days active', activeDays == null ? '-' : activeDays],
          ['Total feed used', formatBags(totalFeedBags)],
          ['Total feed cost (NGN)', totalFeedCost.toLocaleString()],
          ...(isLayer ? [['Total eggs collected', `${totalEggs.toLocaleString()} (${formatCrates(totalEggs)})`]] : []),
          ['Vaccinations done', doneVaccinations],
        ],
      }),
    },
    logs: {
      title: 'Download Daily Logs Report',
      subtitle: 'Every entry recorded for this batch',
      build: () => ({
        heading: 'Daily Logs',
        filename: safeName + '-daily-logs.pdf',
        headers: ['Date', 'Type', 'Detail'],
        rows: dailyLogs.map((item) => [formatDate(item.date), item.kind, item.detail]),
      }),
    },
    feed: {
      title: 'Download Feed Report',
      subtitle: 'All feed recorded for this batch',
      build: () => ({
        heading: 'Feed Record',
        filename: safeName + '-feed.pdf',
        headers: ['Date', 'Feed type', 'Bags', 'Bag size', 'Cost (NGN)'],
        rows: feedLogs.map((e) => [
          formatDate(e.date),
          e.feedType || '',
          formatBags(feedBags(e)),
          `${Number(e.bagSizeKg) || FEED_BAG_KG}kg`,
          (Number(e.costNaira) || 0).toLocaleString(),
        ]),
      }),
    },
    vaccines: {
      title: 'Download Vaccination Report',
      subtitle: 'Vaccinations given and still due',
      build: () => ({
        heading: 'Vaccinations',
        filename: safeName + '-vaccinations.pdf',
        headers: ['Date', 'Vaccine', 'Dose', 'Method', 'Birds', 'Given by', 'Status'],
        rows: [
          ...vaccinationHistory.map((v) => [
            formatDate(v.date),
            v.vaccineName || '',
            v.doseNumber || '-',
            ROUTES[v.route]?.label || '-',
            v.birds ? Number(v.birds).toLocaleString() : '-',
            v.administeredBy || '-',
            'Given',
          ]),
          ...dueVaccines.map((s) => [
            formatDate(s.dueDate),
            s.vaccineName || '',
            s.doseNumber || '-',
            ROUTES[s.route]?.label || '-',
            s.birdsToVaccinate ? Number(s.birdsToVaccinate).toLocaleString() : '-',
            '-',
            s.dueDate < todayIso || s.status === 'missed' ? 'Overdue' : 'Due',
          ]),
        ],
      }),
    },
    multivitamins: {
      title: 'Download Vitamins Report',
      subtitle: 'Vitamins and supplements given to this batch',
      build: () => ({
        heading: 'Vitamins & Supplements',
        filename: safeName + '-vitamins.pdf',
        headers: ['Started', 'Type', 'Product', 'Dose', 'Reason', 'Withdrawal'],
        rows: multivitaminLogs.map((m) => [
          formatDate(m.date),
          findSupplementType(m.type)?.label || 'Supplement',
          m.product || '',
          describeDose(m) || '-',
          m.reason || m.notes || '-',
          m.withdrawalDays ? `${m.withdrawalDays} days` : '-',
        ]),
      }),
    },
    mortality: {
      title: 'Download Mortality Report',
      subtitle: 'Every death recorded for this batch',
      build: () => ({
        heading: 'Mortality',
        filename: safeName + '-mortality.pdf',
        headers: ['Date', 'Birds died', 'Cause'],
        rows: mortalityLogs.map((m) => [formatDate(m.date), m.count || 0, m.note || '']),
      }),
    },
    weight: {
      title: 'Download Weight Report',
      subtitle: 'Every weigh-in recorded for this batch',
      build: () => ({
        heading: 'Bird Weight',
        filename: safeName + '-weight.pdf',
        headers: ['Date', 'Average weight', 'Change', 'Birds weighed'],
        rows: [...weightHistory].reverse().map((w) => [
          formatDate(w.date),
          formatKg(w.averageWeightKg),
          w.change == null ? 'First weigh-in' : formatChange(w.change),
          w.sampleSize ? Number(w.sampleSize).toLocaleString() : '-',
        ]),
      }),
    },
  };

  const report = REPORTS[activeTab] || REPORTS.overview;
  const handleDownload = async () => {
    const built = report.build();
    if (built.rows.length === 0) return toast('There is nothing to download on this tab yet', 'error');
    try {
      await downloadTableReport({
        filename: built.filename,
        title: built.heading,
        subtitle: `${batch.name} (${birdTypeLabel(batchType)})`,
        headers: built.headers,
        rows: built.rows,
      });
      toast('Report downloaded', 'success');
    } catch (err) {
      console.error('Report generation failed:', err);
      toast('Could not create the report. Please try again.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-5">
      <Link
        to="/batches"
        className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={2.5} />
        <span>Back to Batches</span>
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <img
              src={batchImage(batch)}
              alt={batch.name}
              className="w-20 h-20 rounded-lg object-cover bg-stone-100 shrink-0"
            />
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-stone-950 font-heading truncate">{batch.name}</h1>
                <span className={typePillClass(batchType)}>{birdTypeLabel(batchType)}</span>
              </div>
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="inline-flex items-center gap-1.5">
                  <Calendar size={13} strokeWidth={2.5} className="text-stone-500" />
                  {formatDate(batch.startDate)} - {batch.closedAt ? formatDate(batch.closedAt) : 'Ongoing'}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <BirdIcon size={13} className="text-stone-500" />
                    {Number(batch.birdCount || 0).toLocaleString()} birds
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={13} strokeWidth={2.5} className="text-stone-500" />
                    {batchPen?.name || batch.housing || 'No pen recorded'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-end gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1.5 ${
                  closed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                {closed && <CheckCircle2 size={12} strokeWidth={3} />}
                {closed ? 'Completed' : 'Active'}
              </span>
              {closed ? (
                <button
                  type="button"
                  onClick={handleReopen}
                  className="h-8 px-3 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} strokeWidth={2.5} /> Reopen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(true)}
                  className="h-8 px-3 rounded-lg bg-[#0D5C3A] hover:bg-[#094229] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Flag size={13} strokeWidth={2.5} /> Complete Batch
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                aria-label={`Delete ${batch.name}`}
                title={`Delete ${batch.name}`}
                className="w-8 h-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Trash2 size={15} strokeWidth={2.5} />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:flex items-stretch divide-x divide-stone-200">
              <HeaderStat icon={BirdIcon} label="Total Birds" value={Number(batch.birdCount || 0).toLocaleString()} />
              {closed && batch.birdsSold != null ? (
                <HeaderStat icon={ShoppingCart} label="Birds Sold" value={Number(batch.birdsSold).toLocaleString()} />
              ) : (
                <HeaderStat icon={BirdIcon} label="Birds Alive" value={currentBirds.toLocaleString()} />
              )}
              <HeaderStat icon={Clock} label="Days Active" value={activeDays == null ? '-' : activeDays + ' days'} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  setActiveTab(tab.id);
                  // On phones the tab row scrolls sideways; keep the chosen tab fully in view.
                  e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
                }}
                className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2.5 rounded-t-lg text-sm transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? 'bg-[#EAF5EF] text-[#0D5C3A] font-semibold border-[#0D5C3A]'
                    : 'text-stone-500 border-transparent hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {activeTab === 'overview' && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-base font-bold text-stone-950 font-heading mb-4">Batch Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <SummaryTile
                    icon={Percent}
                    label="Feed Conversion Ratio"
                    value={fcrValue}
                    hint={`(${fcrNote})`}
                  />
                  <SummaryTile
                    icon={TrendingDown}
                    label="Mortality"
                    value={totalMortality.toLocaleString()}
                    suffix={lossPercent == null ? null : '(' + lossPercent + '%)'}
                  />
                  <SummaryTile
                    icon={Egg}
                    label="Average Egg Production"
                    value={avgEggsPerDay == null ? '-' : avgEggsPerDay.toLocaleString()}
                    hint={isLayer ? '(Per day)' : '(Egg-laying birds only)'}
                  />
                  <SummaryTile
                    icon={Package}
                    label="Total Eggs Collected"
                    value={totalEggs.toLocaleString()}
                    hint={totalEggs > 0 && avgEggsPerDay ? '(avg. ' + avgEggsPerDay + '/day)' : null}
                  />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-stone-950 font-heading">Production Performance</h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Based on: <span className="font-semibold text-stone-700">{performance.basis}</span>
                      {' · '}{birdTypeLabel(batchType)} batches are raised for {purpose === 'dual' ? 'eggs and meat' : purpose === 'other' ? 'other purposes' : purpose}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${ratingStyle.pill}`}>
                    {ratingStyle.label}
                  </span>
                </div>

                <div className="rounded-xl bg-stone-50 border border-stone-100 p-4 sm:p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${ratingStyle.bar}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-base font-bold text-stone-950 font-heading">{performance.headline}</div>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">{performance.detail}</p>
                    </div>
                  </div>

                  {performance.metrics.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {performance.metrics.map((m) => (
                        <div key={m.label} className="rounded-lg bg-white border border-stone-200 px-3 py-2.5 min-w-0">
                          <div className="text-[11px] text-stone-500 truncate">{m.label}</div>
                          <div className="text-sm font-bold text-stone-950 mt-0.5 truncate">{m.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(purpose === 'meat' || purpose === 'dual') && !closed && (
                    <button
                      type="button"
                      onClick={() => setShowCompleteModal(true)}
                      className="text-xs font-semibold text-[#0D5C3A] hover:underline cursor-pointer"
                    >
                      Sold the birds? Complete the batch to record sales and see profit.
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-base font-bold text-stone-950 font-heading mb-2">Key Insights</h2>
                <div>
                  <InsightRow
                    icon={Egg}
                    label="Peak egg production (if applicable)"
                    value={peakEggDay == null ? '-' : peakEggDay.toLocaleString() + ' eggs'}
                  />
                  <InsightRow icon={Percent} label="Feed conversion ratio" sub={fcrNote} value={fcrValue} />
                  <InsightRow
                    icon={Wheat}
                    label="Total feed used"
                    value={totalFeedBags > 0 ? formatBags(totalFeedBags) : '-'}
                  />
                  <InsightRow icon={Syringe} label="Total vaccination records" value={doneVaccinations} />
                </div>
              </div>
            </>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-base font-bold text-stone-950 font-heading mb-2">Daily Logs</h2>
              {dailyLogs.length === 0 ? (
                <EmptyState icon={Activity} title="Nothing recorded for this batch yet." />
              ) : (
                <div>
                  {dailyLogs.map((item, index) => (
                    <LogRow
                      key={index}
                      icon={item.icon}
                      primary={item.kind}
                      secondary={item.detail}
                      value={formatDate(item.date)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'feed' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="text-base font-bold text-stone-950 font-heading">Feed Record</h2>
                <button
                  type="button"
                  onClick={() => setLogModal('feed')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C3A] hover:underline cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} /> Log Feed
                </button>
              </div>
              {feedLogs.length === 0 ? (
                <EmptyState icon={Wheat} title="No feed recorded for this batch yet." />
              ) : (
                <div>
                  {feedLogs.map((entry, index) => (
                    <LogRow
                      key={entry.entryId || index}
                      icon={Wheat}
                      primary={[entry.feedType || 'Feed', entry.brand].filter(Boolean).join(' · ')}
                      secondary={formatDate(entry.date)}
                      value={formatBags(feedBags(entry))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vaccines' && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-base font-bold text-stone-950 font-heading">Vaccination Calendar</h2>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => openVaccination({ mode: 'record' })}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C3A] hover:underline cursor-pointer"
                    >
                      <CheckCircle2 size={14} strokeWidth={2.5} /> Record Given
                    </button>
                    <button
                      type="button"
                      onClick={() => openVaccination({ mode: 'schedule' })}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C3A] hover:underline cursor-pointer"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Schedule
                    </button>
                  </div>
                </div>
                <CalendarPicker
                  variant="full"
                  value={calendarDate}
                  onChange={setCalendarDate}
                  events={healthEvents}
                  onEventClick={(e) => {
                    if (e.kind === 'vaccine' && e.status !== 'done' && e.source?.scheduleId) recordScheduled(e.source);
                  }}
                  agendaActions={(date) => (
                    <>
                      <button
                        type="button"
                        onClick={() => openVaccination({ mode: date > todayIso ? 'schedule' : 'record', date })}
                        className="px-2.5 h-7 rounded-lg bg-[#0D5C3A] hover:bg-[#094229] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Syringe size={12} /> Vaccine
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogModal('multivitamin')}
                        className="px-2.5 h-7 rounded-lg border border-stone-200 hover:border-[#0D5C3A]/40 text-stone-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} /> Vitamin
                      </button>
                    </>
                  )}
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-base font-bold text-stone-950 font-heading mb-2">Due</h2>
                {dueVaccines.length === 0 ? (
                  <EmptyState icon={Syringe} title="No vaccinations due." description="Schedule the next one so you get a reminder." />
                ) : (
                  <div>
                    {dueVaccines.map((item) => {
                      const overdue = item.status === 'missed' || item.dueDate < todayIso;
                      return (
                        <div key={item.scheduleId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 py-3.5 border-b border-stone-100 last:border-0">
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${overdue ? 'bg-rose-50' : 'bg-[#EAF5EF]'}`}>
                              <Syringe size={16} strokeWidth={2.5} className={overdue ? 'text-rose-600' : 'text-[#0D5C3A]'} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-stone-900 break-words">
                                {item.vaccineName}{item.doseNumber ? ` · ${item.doseNumber}` : ''}
                              </div>
                              <div className={`text-xs ${overdue ? 'text-rose-600 font-semibold' : 'text-stone-500'}`}>
                                {overdue ? 'Overdue since ' : 'Due '}{formatDate(item.dueDate)}
                                {ROUTES[item.route] && <span className="text-stone-500 font-normal"> · {ROUTES[item.route].label}</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => recordScheduled(item)}
                            className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border border-[#0D5C3A]/30 text-[#0D5C3A] hover:bg-[#EAF5EF] transition-colors cursor-pointer shrink-0"
                          >
                            Record as given
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-base font-bold text-stone-950 font-heading mb-2">Vaccination History</h2>
                {vaccinationHistory.length === 0 ? (
                  <EmptyState icon={Syringe} title="No vaccinations recorded for this batch yet." />
                ) : (
                  <div>
                    {vaccinationHistory.map((v) => (
                      <LogRow
                        key={v.key}
                        icon={Syringe}
                        primary={`${v.vaccineName}${v.doseNumber ? ` · ${v.doseNumber}` : ''}`}
                        secondary={[
                          ROUTES[v.route]?.label,
                          v.birds ? `${Number(v.birds).toLocaleString()} birds` : null,
                          v.administeredBy ? `by ${v.administeredBy}` : null,
                          v.lotNumber ? `Lot ${v.lotNumber}` : null,
                        ].filter(Boolean).join(' · ') || 'Given'}
                        value={formatDate(v.date)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'multivitamins' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="text-base font-bold text-stone-950 font-heading">Vitamins &amp; Supplements</h2>
                <button
                  type="button"
                  onClick={() => setLogModal('multivitamin')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C3A] hover:underline cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} /> Record Vitamin
                </button>
              </div>
              {multivitaminLogs.length === 0 ? (
                <EmptyState
                  icon={PillIcon}
                  title="No vitamins or supplements recorded for this batch yet."
                  description="These are saved on this device only. There is no supplements endpoint on the backend yet."
                />
              ) : (
                <div>
                  {multivitaminLogs.map((item) => (
                    <LogRow
                      key={item.id}
                      icon={PillIcon}
                      primary={`${item.product}${findSupplementType(item.type) ? ` · ${findSupplementType(item.type).label}` : ''}`}
                      secondary={[
                        describeDose(item),
                        item.reason,
                        item.withdrawalDays ? `${item.withdrawalDays}-day withdrawal` : null,
                      ].filter(Boolean).join(' · ')}
                      value={formatDate(item.date)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sickbay' && (
            <SickBayTab
              batch={batch}
              birdsAlive={currentBirds}
              readOnly={closed}
              onMortalityLogged={refreshMortality}
              openSignal={sickBaySignal}
            />
          )}

          {activeTab === 'mortality' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="text-base font-bold text-stone-950 font-heading">Mortality</h2>
                <button
                  type="button"
                  onClick={() => setLogModal('mortality')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C3A] hover:underline cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} /> Log Mortality
                </button>
              </div>
              {mortalityLogs.length === 0 ? (
                <EmptyState icon={TrendingDown} title="No mortality recorded for this batch." />
              ) : (
                <div>
                  {mortalityLogs.map((entry, index) => (
                    <LogRow
                      key={entry.entryId || index}
                      icon={TrendingDown}
                      primary={(Number(entry.count) || 0) + ' birds'}
                      secondary={entry.note || 'No cause recorded'}
                      value={formatDate(entry.date)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'weight' && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-base font-bold text-stone-950 font-heading">Weight Summary</h2>
                  <button
                    type="button"
                    onClick={() => setLogModal('weight')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C3A] hover:underline cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={2.5} /> Log Weight
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <SummaryTile
                    icon={Scale}
                    label="Latest average"
                    value={latestWeight ? formatKg(latestWeight.averageWeightKg) : '-'}
                    hint={latestWeight ? formatDate(latestWeight.date) : 'No weigh-ins yet'}
                  />
                  <SummaryTile
                    icon={TrendingUp}
                    label="Gain per bird"
                    value={weightGain == null ? '-' : formatChange(weightGain)}
                    hint={weightGain == null ? 'Needs 2 weigh-ins' : `Since ${formatDate(firstWeight.date)}`}
                  />
                  <SummaryTile
                    icon={Percent}
                    label="Feed conversion"
                    value={fcrValue}
                    hint={fcrNote}
                  />
                  <SummaryTile
                    icon={BirdIcon}
                    label="Weigh-ins"
                    value={weightHistory.length}
                    hint={latestWeight?.sampleSize ? `Last: ${Number(latestWeight.sampleSize).toLocaleString()} birds weighed` : null}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-base font-bold text-stone-950 font-heading mb-2">Weigh-ins</h2>
                {weightHistory.length === 0 ? (
                  <EmptyState
                    icon={Scale}
                    title="No weigh-ins recorded for this batch yet."
                    description="Weigh a handful of birds, record the average, and repeat every week or two to track growth."
                  />
                ) : (
                  <div>
                    {[...weightHistory].reverse().map((w, index) => (
                      <LogRow
                        key={w.entryId || index}
                        icon={Scale}
                        primary={`${formatKg(w.averageWeightKg)} average`}
                        secondary={[
                          w.change == null ? 'First weigh-in' : `${formatChange(w.change)} since previous`,
                          w.sampleSize ? `${Number(w.sampleSize).toLocaleString()} birds weighed` : null,
                        ].filter(Boolean).join(' · ')}
                        value={formatDate(w.date)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right column. Quick Actions sits at the top now that Recent
            Activity is gone, with the tab's own report below it. */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-base font-bold text-stone-950 font-heading mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction icon={Wheat} label="Log Feed" onClick={() => setLogModal('feed')} />
              <QuickAction icon={PillIcon} label="Log Vitamin" onClick={() => setLogModal('multivitamin')} />
              <QuickAction icon={Syringe} label="Log Vaccination" onClick={() => openVaccination()} />
              <QuickAction icon={BirdIcon} label="Log Mortality" onClick={() => setLogModal('mortality')} />
              <QuickAction
                icon={Stethoscope}
                label="Isolate Sick Birds"
                onClick={() => {
                  setActiveTab('sickbay');
                  setSickBaySignal((n) => n + 1);
                }}
              />
              {isLayer && <QuickAction icon={Egg} label="Log Eggs" onClick={() => setLogModal('eggs')} />}
              <QuickAction icon={Scale} label="Log Weight" onClick={() => setLogModal('weight')} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-base font-bold text-stone-950 font-heading mb-4">Documents</h2>
            <button
              type="button"
              onClick={handleDownload}
              className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                  <FileText size={18} strokeWidth={2.5} className="text-stone-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-stone-900 truncate">{report.title}</div>
                  <div className="text-xs text-stone-500 truncate">{report.subtitle}</div>
                </div>
              </div>
              <span className="w-9 h-9 rounded-lg border border-stone-200 flex items-center justify-center shrink-0 group-hover:bg-stone-50 transition-colors">
                <Download size={16} strokeWidth={2.5} className="text-stone-600" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* LOG MODALS */}
      {/* 1. Feed usage — taken from the farm's feed store */}
      <FeedUsageModal
        isOpen={logModal === 'feed'}
        onClose={() => setLogModal(null)}
        onSaved={(entry) => setFeedLogs((prev) => [entry, ...prev])}
        defaultBatchId={batchId}
        onAddStock={() => setLogModal('feedStock')}
      />
      <FeedPurchaseModal
        isOpen={logModal === 'feedStock'}
        onClose={() => setLogModal('feed')}
      />

      {/* 2. Mortality Modal */}
      <Modal open={logModal === 'mortality'} title={`Log Mortality for ${batch.name}`} onClose={() => setLogModal(null)}>
        <form onSubmit={handleLogMortality} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">Date</label>
            <input
              type="date"
              value={logDate}
              onChange={e => setLogDate(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">Number of Birds Died</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 2"
              value={mortCount}
              onChange={e => setMortCount(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">Suspected Cause / Note</label>
            <input
              type="text"
              placeholder="e.g. Heat stress, respiratory, unknown"
              value={mortReason}
              onChange={e => setMortReason(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setLogModal(null)} className="px-4 py-2 text-xs font-bold text-neutral-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">Save</button>
          </div>
        </form>
      </Modal>

      {/* 3. Eggs Modal (ONLY LAYER) */}
      {isLayer && (
        <Modal open={logModal === 'eggs'} title={`Log Eggs for ${batch.name}`} onClose={() => setLogModal(null)}>
          <form onSubmit={handleLogEggs} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">Date</label>
              <input
                type="date"
                value={logDate}
                onChange={e => setLogDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">Crates Collected (30 eggs/crate)</label>
              <input
                type="number"
                placeholder="e.g. 12"
                value={eggCrates}
                onChange={e => setEggCrates(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">Loose Eggs (optional)</label>
              <input
                type="number"
                placeholder="e.g. 14"
                value={looseEggs}
                onChange={e => setLooseEggs(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setLogModal(null)} className="px-4 py-2 text-xs font-bold text-neutral-600">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">Save Eggs</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Weight Modal — sample-based, feeds the Feed Conversion Ratio insight */}
      <Modal open={logModal === 'weight'} title={`Log Bird Weight for ${batch.name}`} onClose={() => setLogModal(null)}>
        <form onSubmit={handleLogWeight} className="space-y-4">
          <p className="text-xs text-neutral-500 -mt-1">
            Weigh a few birds and enter the average — this is what Feed Conversion Ratio is calculated from.
          </p>
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">Date</label>
            <input
              type="date"
              value={logDate}
              onChange={e => setLogDate(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">Average Weight per Bird (kg)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 1.8"
              value={avgWeightKg}
              onChange={e => setAvgWeightKg(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">Birds Weighed (optional)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 10"
              value={weightSampleSize}
              onChange={e => setWeightSampleSize(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setLogModal(null)} className="px-4 py-2 text-xs font-bold text-neutral-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">Save Weight</button>
          </div>
        </form>
      </Modal>

      {/* 4. Vaccination — schedule or record, with the appointment calendar */}
      <VaccinationModal
        isOpen={logModal === 'vaccine'}
        onClose={() => setLogModal(null)}
        onSaved={handleVaccinationSaved}
        defaultBatchId={batchId}
        events={healthEvents}
        prefill={vacPrefill}
      />

      {/* 5. Vitamins & supplements */}
      <SupplementModal
        isOpen={logModal === 'multivitamin'}
        onClose={() => setLogModal(null)}
        onSaved={setAllSupplements}
        defaultBatchId={batchId}
        events={healthEvents}
      />

      {/* Complete batch — records sales, closes the batch */}
      <CompleteBatchModal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        batch={batch}
        purpose={purpose}
        birdsAlive={currentBirds}
        otherCosts={costs.feed + costs.vaccines + costs.supplements}
        onConfirm={handleCompleteBatch}
      />

      {/* Delete Batch Modal */}
      <DeleteBatchModal
        open={showDeleteModal}
        batch={batch}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteBatch}
      />
    </div>
  );
}

export default BatchDetailPage;
