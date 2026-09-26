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
  Package,
  FileText,
  Download,
} from 'lucide-react';
import { useBatches } from '../context/BatchContext';
import { getLogs, createLog } from '../api/logs';
import { QUEUED_SAVE_MESSAGE } from '../lib/offlineQueue';
import { getSchedule, createSchedule, updateSchedule } from '../api/schedule';
import { Modal } from '../components/ui/Modal';
import { VaccinationModal } from '../components/ui/VaccinationModal';
import { DeleteBatchModal } from '../components/ui/DeleteBatchModal';
import { useToast } from '../components/ui/Toast';
import { PillIcon } from '../components/ui/PillIcon';
import { BirdIcon } from '../components/ui/BirdIcon';
import { EGGS_PER_CRATE, batchAge, batchImage, daysActive, formatDate, typePillClass } from '../lib/batch';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'logs', label: 'Daily Logs' },
  { id: 'feed', label: 'Feed Record' },
  { id: 'vaccines', label: 'Vaccination' },
  { id: 'multivitamins', label: 'Multivitamins' },
  { id: 'mortality', label: 'Bird Lost' },
];

/**
 * Reports are built in the browser from the rows already on screen. There is
 * no export endpoint on the backend (the S3 reports bucket exists but nothing
 * writes to it), so generating the file client-side is what makes the per-tab
 * download real rather than a button that does nothing.
 */
function downloadCsv(filename, headers, rows) {
  const escape = (value) => {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [headers.join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="px-5 first:pl-0 last:pr-0">
      <div className="flex items-center gap-2 text-stone-500">
        <Icon size={16} strokeWidth={2.5} className="text-stone-700 shrink-0" />
        <span className="text-xs whitespace-nowrap">{label}</span>
      </div>
      <div className="text-xl font-bold text-stone-950 font-heading mt-1">{value}</div>
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
  const { batches, selectBatch, deleteBatch } = useBatches();
  const toast = useToast();

  const batch = batches.find(b => b.batchId === batchId) || null;

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Batch specific logs state
  const [mortalityLogs, setMortalityLogs] = useState([]);
  const [feedLogs, setFeedLogs] = useState([]);
  const [eggLogs, setEggLogs] = useState([]);
  const [scheduleList, setScheduleList] = useState([]);
  const [multivitaminLogs, setMultivitaminLogs] = useState(() => {
    try {
      const stored = localStorage.getItem(`farmbook_multivitamins_${batchId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Modal states for logging
  const [logModal, setLogModal] = useState(null); // 'mortality' | 'feed' | 'eggs' | 'vaccine' | 'multivitamin'
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));

  // Form fields
  const [mortCount, setMortCount] = useState('');
  const [mortReason, setMortReason] = useState('');

  const [feedType, setFeedType] = useState('Pellets');
  const [feedKg, setFeedKg] = useState('');
  const [feedCost, setFeedCost] = useState('');

  const [eggCrates, setEggCrates] = useState('');
  const [looseEggs, setLooseEggs] = useState('');

  const [newVacName, setNewVacName] = useState('Newcastle (ND)');
  const [newVacDate, setNewVacDate] = useState(new Date().toISOString().slice(0, 10));

  const [multiName, setMultiName] = useState('Vitalyte / Amino Flash');
  const [multiDose, setMultiDose] = useState('100g in 50L water');
  const [multiNotes, setMultiNotes] = useState('');

  useEffect(() => {
    if (!batchId) return;
    selectBatch(batchId);
    let cancelled = false;

    async function loadBatchData() {
      setLoading(true);
      try {
        const [mRes, fRes, sRes, eRes] = await Promise.all([
          getLogs(batchId, 'mortality').catch(() => ({ logs: [], entries: [] })),
          getLogs(batchId, 'feed').catch(() => ({ logs: [], entries: [] })),
          getSchedule(batchId).catch(() => ({ schedule: [] })),
          getLogs(batchId, 'eggs').catch(() => ({ logs: [], entries: [] })),
        ]);

        if (!cancelled) {
          const mList = mRes?.logs || mRes?.entries || [];
          const fList = fRes?.logs || fRes?.entries || [];
          const eList = eRes?.logs || eRes?.entries || [];
          setMortalityLogs(mList);
          setFeedLogs(fList);
          setScheduleList(sRes?.schedule || []);
          setEggLogs(eList);
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
  const totalFeedKg = feedLogs.reduce((acc, curr) => acc + (curr.amountKg || 0), 0);

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

  const handleLogFeed = async (e) => {
    e.preventDefault();
    if (!feedKg || Number(feedKg) <= 0) return toast('Please enter kg amount', 'error');
    try {
      const createdItem = await createLog(batchId, 'feed', {
        date: logDate,
        feedType,
        amountKg: Number(feedKg),
        costNaira: feedCost ? Number(feedCost) : 0,
      });
      if (createdItem?.queued) {
        toast(QUEUED_SAVE_MESSAGE, 'success');
        setFeedLogs([createdItem, ...feedLogs]);
      } else {
        toast('Feed usage recorded', 'success');
        const res = await getLogs(batchId, 'feed');
        const items = res?.logs || res?.entries || (createdItem ? [createdItem, ...feedLogs] : feedLogs);
        setFeedLogs(items);
      }
      setFeedKg('');
      setFeedCost('');
      setLogModal(null);
    } catch (err) {
      toast(err.message || 'Failed to record feed', 'error');
    }
  };

  const handleLogEggs = async (e) => {
    e.preventDefault();
    const batchType = (batch?.type || '').toLowerCase();
    if (batchType !== 'layer') return toast('Only Layer batches produce eggs', 'error');
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

  const handleAddVaccine = async ({ vaccineName, dueDate, reminderTiming }) => {
    try {
      await createSchedule(batchId, { vaccineName, dueDate });
      toast('Vaccination scheduled!', 'success');
      const res = await getSchedule(batchId);
      setScheduleList(res.schedule || []);
      setLogModal(null);
    } catch (err) {
      toast(err.message || 'Failed to add vaccination', 'error');
      throw err;
    }
  };

  const handleMarkVaccineDone = async (scheduleId) => {
    try {
      await updateSchedule(batchId, scheduleId, { status: 'done' });
      toast('Marked as done', 'success');
      const res = await getSchedule(batchId);
      setScheduleList(res.schedule || []);
    } catch (err) {
      toast(err.message || 'Update failed', 'error');
    }
  };

  const handleLogMultivitamin = (e) => {
    e.preventDefault();
    const entry = {
      id: Date.now().toString(),
      date: logDate,
      product: multiName,
      dosage: multiDose,
      notes: multiNotes,
    };
    const updated = [entry, ...multivitaminLogs];
    setMultivitaminLogs(updated);
    localStorage.setItem(`farmbook_multivitamins_${batchId}`, JSON.stringify(updated));
    toast('Multivitamin logged', 'success');
    setMultiNotes('');
    setLogModal(null);
  };

  const handleDeleteBatch = async (id) => {
    await deleteBatch(id);
    toast(`Batch "${batch?.name || 'Batch'}" was permanently deleted.`, 'success');
    navigate('/dashboard');
  };

  const batchType = (batch?.type || '').toLowerCase();
  const isLayer = batchType === 'layer';

  const birdsSold = Math.max(0, (batch.birdCount || 0) - totalMortality);
  const totalEggs = eggLogs.reduce((sum, e) => sum + (Number(e.crates) || 0) * EGGS_PER_CRATE + (Number(e.looseEggs) || 0), 0);
  const totalFeedCost = feedLogs.reduce((sum, e) => sum + (Number(e.costNaira) || 0), 0);
  const closedDays = daysActive(batch.startDate, batch.closedAt);
  const runningDays = batch.startDate
    ? Math.max(0, Math.round((Date.now() - new Date(batch.startDate)) / 86400000))
    : null;
  const activeDays = closedDays != null ? closedDays : runningDays;
  const lossPercent = batch.birdCount ? Math.round((totalMortality / batch.birdCount) * 1000) / 10 : null;
  const avgEggsPerDay = isLayer && activeDays ? Math.round(totalEggs / activeDays) : null;
  const doneVaccinations = scheduleList.filter((s) => s.status === 'done').length;

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
    ...feedLogs.map((e) => ({ date: e.date, kind: 'Feed logged', detail: `${e.feedType || 'Feed'} - ${Number(e.amountKg) || 0} kg`, icon: Wheat })),
    ...mortalityLogs.map((e) => ({ date: e.date, kind: 'Bird loss recorded', detail: `${Number(e.count) || 0} birds${e.note ? ` (${e.note})` : ''}`, icon: TrendingDown })),
    ...eggLogs.map((e) => ({ date: e.date, kind: 'Eggs recorded', detail: `${Number(e.crates) || 0} crates, ${Number(e.looseEggs) || 0} loose`, icon: Egg })),
    ...multivitaminLogs.map((m) => ({ date: m.date, kind: 'Multivitamin added', detail: `${m.product || ''} ${m.dosage || ''}`.trim(), icon: PillIcon })),
    ...scheduleList.map((s) => ({ date: s.dueDate, kind: 'Vaccination scheduled', detail: `${s.vaccineName || ''} (${s.status || 'upcoming'})`, icon: Syringe })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const closed = batch.status === 'closed';
  const safeName = (batch.name || 'batch').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  // Each tab exports the rows it is showing, so the file always matches what
  // is on screen.
  const REPORTS = {
    overview: {
      title: 'Download Batch Report',
      subtitle: 'Get a complete summary of this batch',
      build: () => ({
        filename: safeName + '-summary.csv',
        headers: ['Metric', 'Value'],
        rows: [
          ['Batch', batch.name],
          ['Type', batchType],
          ['Status', closed ? 'Completed' : 'Active'],
          ['Started', batch.startDate || ''],
          ['Closed', batch.closedAt || ''],
          ['Age', batchAge(batch)],
          ['Total birds placed', batch.birdCount || 0],
          ['Birds remaining', currentBirds],
          ['Birds lost', totalMortality],
          ['Days active', activeDays == null ? '' : activeDays],
          ['Total feed used (kg)', totalFeedKg],
          ['Total feed cost (NGN)', totalFeedCost],
          ['Total eggs collected', totalEggs],
          ['Vaccination records', doneVaccinations],
        ],
      }),
    },
    logs: {
      title: 'Download Daily Logs Report',
      subtitle: 'Every entry recorded for this batch',
      build: () => ({
        filename: safeName + '-daily-logs.csv',
        headers: ['Date', 'Type', 'Detail'],
        rows: dailyLogs.map((item) => [item.date || '', item.kind, item.detail]),
      }),
    },
    feed: {
      title: 'Download Feed Report',
      subtitle: 'All feed recorded for this batch',
      build: () => ({
        filename: safeName + '-feed.csv',
        headers: ['Date', 'Feed type', 'Amount (kg)', 'Cost (NGN)'],
        rows: feedLogs.map((e) => [e.date || '', e.feedType || '', e.amountKg || 0, e.costNaira || 0]),
      }),
    },
    vaccines: {
      title: 'Download Vaccination Report',
      subtitle: 'Scheduled and completed vaccinations',
      build: () => ({
        filename: safeName + '-vaccinations.csv',
        headers: ['Vaccine', 'Due date', 'Status'],
        rows: scheduleList.map((s) => [s.vaccineName || '', s.dueDate || '', s.status || '']),
      }),
    },
    multivitamins: {
      title: 'Download Multivitamin Report',
      subtitle: 'Multivitamins recorded for this batch',
      build: () => ({
        filename: safeName + '-multivitamins.csv',
        headers: ['Date', 'Product', 'Dosage', 'Notes'],
        rows: multivitaminLogs.map((m) => [m.date || '', m.product || '', m.dosage || '', m.notes || '']),
      }),
    },
    mortality: {
      title: 'Download Bird Loss Report',
      subtitle: 'Every bird loss recorded for this batch',
      build: () => ({
        filename: safeName + '-bird-loss.csv',
        headers: ['Date', 'Birds lost', 'Cause'],
        rows: mortalityLogs.map((m) => [m.date || '', m.count || 0, m.note || '']),
      }),
    },
  };

  const report = REPORTS[activeTab] || REPORTS.overview;
  const handleDownload = () => {
    const built = report.build();
    if (built.rows.length === 0) return toast('There is nothing to download on this tab yet', 'error');
    downloadCsv(built.filename, built.headers, built.rows);
    toast('Report downloaded', 'success');
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
                <span className={typePillClass(batchType)}>{batchType}</span>
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
                    {batch.housing || 'No house recorded'}
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

            <div className="flex items-stretch divide-x divide-stone-200">
              <HeaderStat icon={BirdIcon} label="Total Birds" value={Number(batch.birdCount || 0).toLocaleString()} />
              <HeaderStat icon={ShoppingCart} label="Birds Sold" value={birdsSold.toLocaleString()} />
              <HeaderStat icon={Clock} label="Days Active" value={activeDays == null ? '-' : activeDays + ' days'} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-t-lg text-sm transition-colors cursor-pointer border-b-2 -mb-px ${
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <SummaryTile
                    icon={TrendingDown}
                    label="Birds Lost"
                    value={totalMortality.toLocaleString()}
                    suffix={lossPercent == null ? null : '(' + lossPercent + '%)'}
                  />
                  <SummaryTile
                    icon={Egg}
                    label="Average Egg Production"
                    value={avgEggsPerDay == null ? '-' : avgEggsPerDay.toLocaleString()}
                    hint={isLayer ? '(Per day)' : '(Layer batches only)'}
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
                <h2 className="text-base font-bold text-stone-950 font-heading mb-4">Production Performance</h2>
                <div className="rounded-xl bg-stone-50 border border-stone-100 p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white border border-stone-200 flex items-center justify-center shrink-0">
                    <TrendingUp size={20} strokeWidth={2.5} className="text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    {totalEggs > 0 || totalFeedKg > 0 ? (
                      <>
                        <div className="text-sm font-semibold text-emerald-800">
                          {lossPercent != null && lossPercent <= 5 ? 'Good performance overall' : 'Performance summary'}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {totalEggs > 0 && totalEggs.toLocaleString() + ' eggs collected'}
                          {totalEggs > 0 && totalFeedKg > 0 && ' - '}
                          {totalFeedKg > 0 && totalFeedKg.toLocaleString() + ' kg of feed used'}
                          {lossPercent != null && ' - ' + lossPercent + '% loss rate'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-semibold text-stone-800">No production data yet</div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          Record feed, eggs or bird losses and this fills in automatically.
                        </div>
                      </>
                    )}
                  </div>
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
                  <InsightRow icon={Percent} label="Best feed conversion rate" value="-" />
                  <InsightRow
                    icon={Wheat}
                    label="Total feed used"
                    value={totalFeedKg > 0 ? totalFeedKg.toLocaleString() + ' kg' : '-'}
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
                      primary={entry.feedType || 'Feed'}
                      secondary={formatDate(entry.date)}
                      value={(Number(entry.amountKg) || 0) + ' kg'}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vaccines' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="text-base font-bold text-stone-950 font-heading">Vaccination</h2>
                <button
                  type="button"
                  onClick={() => setLogModal('vaccine')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C3A] hover:underline cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} /> Add Vaccination
                </button>
              </div>
              {scheduleList.length === 0 ? (
                <EmptyState icon={Syringe} title="No vaccinations scheduled for this batch yet." />
              ) : (
                <div>
                  {scheduleList.map((item, index) => (
                    <div
                      key={item.scheduleId || index}
                      className="flex items-center justify-between gap-4 py-3.5 border-b border-stone-100 last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                          <Syringe size={16} strokeWidth={2.5} className="text-stone-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-stone-900 truncate">{item.vaccineName}</div>
                          <div className="text-xs text-stone-500">Due {formatDate(item.dueDate)}</div>
                        </div>
                      </div>
                      {item.status === 'done' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Done
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkVaccineDone(item.scheduleId)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer shrink-0"
                        >
                          Mark done
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'multivitamins' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="text-base font-bold text-stone-950 font-heading">Multivitamins</h2>
                <button
                  type="button"
                  onClick={() => setLogModal('multivitamin')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C3A] hover:underline cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} /> Log Multivitamin
                </button>
              </div>
              {multivitaminLogs.length === 0 ? (
                <EmptyState
                  icon={PillIcon}
                  title="No multivitamins recorded for this batch yet."
                  description="These are saved on this device only. There is no multivitamin endpoint on the backend yet."
                />
              ) : (
                <div>
                  {multivitaminLogs.map((item) => (
                    <LogRow
                      key={item.id}
                      icon={PillIcon}
                      primary={item.product}
                      secondary={item.dosage + (item.notes ? ' - ' + item.notes : '')}
                      value={formatDate(item.date)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'mortality' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="text-base font-bold text-stone-950 font-heading">Bird Lost</h2>
                <button
                  type="button"
                  onClick={() => setLogModal('mortality')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5C3A] hover:underline cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} /> Log Bird Lost
                </button>
              </div>
              {mortalityLogs.length === 0 ? (
                <EmptyState icon={TrendingDown} title="No bird losses recorded for this batch." />
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
        </div>

        {/* Right column. Quick Actions sits at the top now that Recent
            Activity is gone, with the tab's own report below it. */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-base font-bold text-stone-950 font-heading mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction icon={Wheat} label="Log Feed" onClick={() => setLogModal('feed')} />
              <QuickAction icon={PillIcon} label="Log Multivitamin" onClick={() => setLogModal('multivitamin')} />
              <QuickAction icon={Syringe} label="Log Vaccination" onClick={() => setLogModal('vaccine')} />
              <QuickAction icon={BirdIcon} label="Log Bird Lost" onClick={() => setLogModal('mortality')} />
              {isLayer && <QuickAction icon={Egg} label="Log Eggs" onClick={() => setLogModal('eggs')} />}
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
      {/* 1. Feed Modal */}
      <Modal open={logModal === 'feed'} title={`Log Feed for ${batch.name}`} onClose={() => setLogModal(null)}>
        <form onSubmit={handleLogFeed} className="space-y-4">
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
            <label className="text-xs font-bold text-neutral-800 block mb-1">Feed Type</label>
            <input
              type="text"
              placeholder="e.g. Grower Mash, Layer Pellets"
              value={feedType}
              onChange={e => setFeedType(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">Amount Used (kg)</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={feedKg}
              onChange={e => setFeedKg(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">Cost in Naira (optional)</label>
            <input
              type="number"
              placeholder="e.g. 15000"
              value={feedCost}
              onChange={e => setFeedCost(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setLogModal(null)} className="px-4 py-2 text-xs font-bold text-neutral-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-neutral-950 text-white rounded-xl text-xs font-bold">Save</button>
          </div>
        </form>
      </Modal>

      {/* 2. Mortality Modal */}
      <Modal open={logModal === 'mortality'} title={`Log Birds Lost for ${batch.name}`} onClose={() => setLogModal(null)}>
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
            <label className="text-xs font-bold text-neutral-800 block mb-1">Birds Lost</label>
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
            <button type="submit" className="px-5 py-2 bg-neutral-950 text-white rounded-xl text-xs font-bold">Save</button>
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
              <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Save Eggs</button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. Vaccine Modal — Airbnb-style Calendar picker */}
      <VaccinationModal
        isOpen={logModal === 'vaccine'}
        onClose={() => setLogModal(null)}
        onConfirm={handleAddVaccine}
        defaultBatchId={batchId}
        title={`Schedule Vaccination${batch ? ` — ${batch.name}` : ''}`}
      />

      {/* 5. Multivitamin Modal */}
      <Modal open={logModal === 'multivitamin'} title={`Record Multivitamin for ${batch.name}`} onClose={() => setLogModal(null)}>
        <form onSubmit={handleLogMultivitamin} className="space-y-4">
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
            <label className="text-xs font-bold text-neutral-800 block mb-1">Product / Brand</label>
            <input
              type="text"
              value={multiName}
              onChange={e => setMultiName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">Dosage / Administration</label>
            <input
              type="text"
              value={multiDose}
              onChange={e => setMultiDose(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">Notes</label>
            <input
              type="text"
              placeholder="e.g. Post-vaccination stress boost"
              value={multiNotes}
              onChange={e => setMultiNotes(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setLogModal(null)} className="px-4 py-2 text-xs font-bold text-neutral-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-neutral-950 text-white rounded-xl text-xs font-bold">Save</button>
          </div>
        </form>
      </Modal>

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
