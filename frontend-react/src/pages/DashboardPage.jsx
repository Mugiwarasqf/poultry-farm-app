import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChartLine,
  ChevronDown,
  ChevronRight,
  Clock,
  PlusCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBatches } from '../context/BatchContext';
import { getLogs, LOGS_CHANGED_EVENT } from '../api/logs';
import { getSchedule } from '../api/schedule';
import { getVaccinationRecords } from '../api/vaccinations';
import { getFeedPurchases } from '../api/feedStock';
import { BATCHES_PER_GROUP, inGroups, safe } from '../lib/farmData';
import { computeFeedStock } from '../lib/feeds';
import { buildHealthEvents } from '../lib/healthEvents';
import { loadSupplements, toIso } from '../lib/supplements';
import {
  batchAge,
  birdPurpose,
  birdTypeLabel,
  computeFCR,
  eggCount,
  feedBags,
  formatBags,
  laysEggs,
} from '../lib/batch';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { LineChart } from '../components/ui/LineChart';
import { FeedUsageModal } from '../components/ui/FeedUsageModal';
import { FeedPurchaseModal } from '../components/ui/FeedPurchaseModal';
import { VaccinationModal } from '../components/ui/VaccinationModal';
import { BirdIcon } from '../components/ui/BirdIcon';
import { VaccineIcon } from '../components/ui/VaccineIcon';
import { FeedIcon } from '../components/ui/FeedIcon';
import { EggIcon } from '../components/ui/EggIcon';
import { BatchIcon } from '../components/ui/BatchIcon';
import { HistoryIcon } from '../components/ui/HistoryIcon';
import { CalendarIcon } from '../components/ui/CalendarIcon';

// The dashboard is a summary: two batches here, the full list on /batches.
const MAX_VISIBLE_BATCHES = 2;
const ACTIVITY_COLLAPSED = 3;
const ACTIVITY_EXPANDED = 10;
const CHART_DAYS = 14;
const BATCH_BANNER = '/birds/jaclou-dl-hens-3420126_1920.jpg';
// "Record Vaccination" opens the existing form already in record mode.
const RECORD_PREFILL = { mode: 'record' };
const FIRST_BATCH_DISMISSED_KEY = 'farmbook_first_batch_prompt_dismissed';

const DAY_MS = 24 * 60 * 60 * 1000;
const isActive = (b) => (b.status || 'active') !== 'closed';

// ---- small formatters -------------------------------------------------------

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIso(d);
}

function daysUntil(isoDate, today) {
  return Math.round((new Date(`${isoDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / DAY_MS);
}

function shortDay(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Apr 24, 2025 • 8:45 AM" when the entry has a real time, else just the date. */
function stamp(at) {
  if (!at) return '';
  const hasTime = at.length > 10;
  const d = hasTime ? new Date(at) : new Date(`${at}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return hasTime ? `${date} • ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : date;
}

function dueWhen(days) {
  if (days === 0) return 'Due today';
  if (days === 1) return 'Next due tomorrow';
  return `Next in ${days} days`;
}

const round1 = (n) => Math.round(n * 10) / 10;

// ---- production performance -------------------------------------------------

/**
 * What the Production Performance card shows for one batch, judged by what
 * its bird type is raised for (the same purpose lib/performance.js uses):
 * egg layers get daily eggs, meat birds get weigh-ins, everything else gets
 * birds alive. Only recorded entries are plotted; too few gives an empty
 * state, never a filled-in line.
 */
function buildPerformance(batch, logs, weightLogs, currentBirds) {
  const purpose = birdPurpose(batch.type);
  const eggs = logs?.eggs || [];
  const showEggs = purpose === 'eggs' || (purpose === 'dual' && eggs.length > 0);

  if (showEggs) {
    const since = isoDaysAgo(CHART_DAYS - 1);
    const byDate = new Map();
    eggs.filter((e) => e.date && e.date >= since).forEach((e) => {
      byDate.set(e.date, (byDate.get(e.date) || 0) + eggCount(e));
    });
    const days = [...byDate.keys()].sort();
    const points = days.map((d) => ({ label: shortDay(d), value: byDate.get(d) }));
    if (points.length === 0) {
      return { kind: 'eggs', title: 'Egg Production', empty: `No eggs recorded in the last ${CHART_DAYS} days.` };
    }

    const avgPerLoggedDay = (from, to) => {
      const inRange = days.filter((d) => d >= from && d <= to);
      if (inRange.length === 0) return null;
      return inRange.reduce((s, d) => s + byDate.get(d), 0) / inRange.length;
    };
    const thisWeek = avgPerLoggedDay(isoDaysAgo(6), toIso(new Date()));
    const lastWeek = avgPerLoggedDay(isoDaysAgo(13), isoDaysAgo(7));
    const change = thisWeek != null && lastWeek ? round1(((thisWeek - lastWeek) / lastWeek) * 100) : null;
    const latest = points[points.length - 1];

    return {
      kind: 'eggs',
      title: 'Egg Production',
      unit: 'eggs/day',
      value: latest.value.toLocaleString(),
      suffix: '/day',
      caption: `Collected on ${latest.label}`,
      change: change == null ? null : { up: change >= 0, text: `${change >= 0 ? '+' : ''}${change}% vs previous week` },
      extras: currentBirds > 0 ? [{ label: 'Laying rate', value: `${round1((latest.value / currentBirds) * 100)}%` }] : [],
      points: points.length >= 2 ? points : null,
      thin: 'Log eggs on another day to see the trend.',
      formatTick: (v) => Math.round(v).toLocaleString(),
    };
  }

  if (purpose === 'meat' || purpose === 'dual') {
    const samples = (weightLogs || [])
      .filter((w) => w.date && Number(w.averageWeightKg) > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (weightLogs == null) return { kind: 'weight', title: 'Average Weight', loading: true };
    if (samples.length === 0) {
      return { kind: 'weight', title: 'Average Weight', empty: 'No weigh-ins recorded yet. Log bird weight from the batch page.' };
    }
    const latest = samples[samples.length - 1];
    const prev = samples[samples.length - 2];
    const gain = prev ? round1(Number(latest.averageWeightKg) - Number(prev.averageWeightKg)) : null;
    const fcr = computeFCR(logs?.feed || [], samples, currentBirds);
    const placed = Number(batch.birdCount) || 0;
    const extras = [];
    if (fcr != null) extras.push({ label: 'Feed conversion', value: `${fcr} : 1` });
    if (placed) extras.push({ label: 'Survival', value: `${round1((currentBirds / placed) * 100)}%` });

    return {
      kind: 'weight',
      title: 'Average Weight',
      value: round1(Number(latest.averageWeightKg)).toLocaleString(),
      suffix: 'kg',
      caption: `Weighed on ${shortDay(latest.date)}`,
      change: gain == null ? null : { up: gain >= 0, text: `${gain >= 0 ? '+' : ''}${gain} kg since ${shortDay(prev.date)}` },
      extras,
      points: samples.length >= 2 ? samples.slice(-10).map((w) => ({ label: shortDay(w.date), value: Number(w.averageWeightKg) })) : null,
      thin: 'Weigh a sample again to see growth over time.',
      formatTick: (v) => `${round1(v)}kg`,
    };
  }

  // Everything else: birds alive at the end of each of the last 14 days.
  const placed = Number(batch.birdCount) || 0;
  const mortality = logs?.mortality || [];
  const start = batch.startDate ? batch.startDate.slice(0, 10) : null;
  const firstDay = start && start > isoDaysAgo(CHART_DAYS - 1) ? start : isoDaysAgo(CHART_DAYS - 1);
  const points = [];
  for (let d = new Date(`${firstDay}T00:00:00`); toIso(d) <= toIso(new Date()); d.setDate(d.getDate() + 1)) {
    const iso = toIso(d);
    const lost = mortality.filter((m) => m.date && m.date <= iso).reduce((s, m) => s + (Number(m.count) || 0), 0);
    points.push({ label: shortDay(iso), value: Math.max(0, placed - lost) });
  }
  const lostThisWeek = mortality
    .filter((m) => m.date && m.date >= isoDaysAgo(6))
    .reduce((s, m) => s + (Number(m.count) || 0), 0);

  return {
    kind: 'alive',
    title: 'Birds Alive',
    value: currentBirds.toLocaleString(),
    suffix: 'birds',
    caption: `Age ${batchAge(batch)}`,
    change: { up: lostThisWeek === 0, text: lostThisWeek === 0 ? 'No losses this week' : `${lostThisWeek} lost this week` },
    extras: placed ? [{ label: 'Survival', value: `${round1((currentBirds / placed) * 100)}%` }] : [],
    points: points.length >= 2 ? points : null,
    thin: 'The trend appears after the batch\'s second day.',
    formatTick: (v) => Math.round(v).toLocaleString(),
  };
}

// ---- presentational pieces ----------------------------------------------------

function Card({ className = '', children }) {
  return (
    <section className={`bg-white rounded-2xl border border-[#E1E8EF] shadow-[0_1px_2px_rgba(20,32,51,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-full bg-[#F7FFE0] flex items-center justify-center shrink-0">
          <Icon size={18} strokeWidth={2} className="text-[#142033]" />
        </span>
        <h2 className="text-base sm:text-lg font-semibold text-[#142033] font-heading truncate">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ViewAll({ to, onClick, children = 'View all' }) {
  const cls = 'inline-flex items-center gap-1 text-xs font-medium text-[#142033]/80 hover:text-[#4D6600] transition-colors shrink-0 cursor-pointer';
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children} <ChevronRight size={14} />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children} <ChevronRight size={14} />
    </button>
  );
}

function SummaryCard({ icon: Icon, label, value, detail, detailIcon: DetailIcon, tone = 'green', detailTone = 'muted', loading }) {
  const bg = tone === 'green' ? 'bg-[#F7FFE0] border-[#E3F5A8]' : 'bg-[#F2F7FF] border-[#DCE7F7]';
  const detailColor = {
    muted: 'text-[#70829B]',
    good: 'text-[#4D6600]',
    warn: 'text-amber-700',
    bad: 'text-rose-600',
  }[detailTone];
  return (
    <div className={`rounded-2xl border ${bg} p-4 sm:p-5 min-h-[128px] flex flex-col`}>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-white/90 border border-white flex items-center justify-center shrink-0">
          <Icon size={20} strokeWidth={2} className="text-[#142033]" />
        </span>
        <span className="text-sm font-medium text-[#142033] leading-tight">{label}</span>
      </div>
      <div className="mt-3 text-2xl sm:text-[28px] font-semibold text-[#142033] font-heading leading-none tabular-nums">
        {loading ? <Skeleton className="h-7 w-20" /> : value}
      </div>
      <div className={`mt-2 text-xs flex items-center gap-1.5 ${detailColor}`}>
        {loading ? (
          <Skeleton className="h-3 w-28" />
        ) : (
          <>
            {DetailIcon && <DetailIcon size={13} className="shrink-0" />}
            <span className="truncate">{detail}</span>
          </>
        )}
      </div>
    </div>
  );
}

function BatchCard({ batch, currentBirds, eggsPerDay, logsLoaded, onOpen }) {
  const eggsBatch = laysEggs(batch.type);
  const purpose = birdPurpose(batch.type);
  const placed = Number(batch.birdCount) || 0;
  const TypeIcon = eggsBatch ? EggIcon : BirdIcon;

  let metric;
  if (eggsBatch) {
    metric = {
      icon: EggIcon,
      label: 'Egg Production',
      value: !logsLoaded ? null : eggsPerDay == null ? 'None this week' : `${eggsPerDay.toLocaleString()}/day`,
    };
  } else if (purpose === 'meat') {
    metric = {
      icon: ShieldCheck,
      label: 'Survival',
      value: !logsLoaded ? null : placed ? `${round1((currentBirds / placed) * 100)}%` : '—',
    };
  } else {
    metric = { icon: CalendarIcon, label: 'Age', value: batchAge(batch) };
  }
  const MetricIcon = metric.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group text-left rounded-2xl border p-4 transition-all cursor-pointer hover:shadow-md ${
        eggsBatch ? 'bg-[#F7FFE0] border-[#E3F5A8] hover:border-[#D2EC7A]' : 'bg-[#F2F7FF] border-[#DCE7F7] hover:border-[#C2D6F2]'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0">
          <TypeIcon size={22} strokeWidth={2} className="text-[#142033]" />
        </span>
        <h3 className="flex-1 min-w-0 text-base font-semibold text-[#142033] truncate group-hover:text-[#4D6600] transition-colors">
          {batch.name}
        </h3>
        <span
          className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium shrink-0 ${
            eggsBatch ? 'bg-[#EFFFC4] text-[#4D6600]' : 'bg-[#E2ECFB] text-[#2F6FD6]'
          }`}
        >
          {birdTypeLabel(batch.type)}
        </span>
      </div>

      <div className="mt-4 flex items-stretch">
        <div className="flex-1 flex items-start gap-2.5 pr-3 border-r border-[#142033]/10 min-w-0">
          <BirdIcon size={17} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] text-[#70829B]">Birds</div>
            <div className="text-base font-semibold text-[#142033] tabular-nums">
              {logsLoaded ? currentBirds.toLocaleString() : <Skeleton className="h-4 w-12 mt-1" />}
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-start gap-2.5 pl-4 min-w-0">
          <MetricIcon size={17} strokeWidth={2} className="mt-0.5 shrink-0 text-[#142033]" />
          <div className="min-w-0">
            <div className="text-[11px] text-[#70829B]">{metric.label}</div>
            <div className="text-base font-semibold text-[#142033] truncate">
              {metric.value ?? <Skeleton className="h-4 w-14 mt-1" />}
            </div>
          </div>
        </div>
        <ChevronRight size={16} className="self-end text-[#142033]/60 shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}


function TintedIcon({ tint, icon: Icon, file, size = 18 }) {
  return (
    <span className={`w-11 h-11 ${tint} rounded-full flex items-center justify-center shrink-0 text-[#142033]`} aria-hidden="true">
      {file ? (
        <img src={file} alt="" style={{ width: size, height: size }} className="object-contain" />
      ) : (
        <Icon size={size} strokeWidth={1.9} />
      )}
    </span>
  );
}

const ACTIVITY_STYLE = {
  feed: { icon: FeedIcon, tint: 'bg-[#EFFFC4]' },
  eggs: { icon: EggIcon, tint: 'bg-amber-50' },
  vaccination: { icon: VaccineIcon, tint: 'bg-[#EFFFC4]' },
  mortality: { icon: BirdIcon, tint: 'bg-rose-50' },
  batch: { icon: PlusCircle, tint: 'bg-[#EAF1FC]' },
};

function QuickAction({ icon: Icon, title, hint, tone, onClick, to, disabled, filledIcon }) {
  const tones = {
    green: 'bg-[#F7FFE0] border-[#E3F5A8] hover:border-[#D2EC7A]',
    blue: 'bg-[#F2F7FF] border-[#DCE7F7] hover:border-[#C2D6F2]',
    red: 'bg-[#FFF4F4] border-[#F8DCDC] hover:border-[#F0C2C2]',
  };
  const cls = `flex items-start gap-3 rounded-2xl border p-3.5 sm:p-4 text-left transition-colors min-h-[84px] ${tones[tone]} ${
    disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
  }`;
  const body = (
    <>
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          filledIcon ? 'bg-[#DFFF83] text-[#17191A]' : 'bg-white text-[#142033]'
        }`}
      >
        <Icon size={18} strokeWidth={filledIcon ? 2.5 : 2} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#142033] leading-tight">{title}</span>
        <span className="block text-xs text-[#70829B] mt-1 leading-snug">{hint}</span>
      </span>
    </>
  );
  if (to && !disabled) return <Link to={to} className={cls}>{body}</Link>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {body}
    </button>
  );
}

function EmptyNote({ children }) {
  return <div className="flex-1 flex items-center justify-center text-center text-xs text-[#70829B] py-8 px-4">{children}</div>;
}

// ---- page ------------------------------------------------------------------------

export function DashboardPage() {
  const navigate = useNavigate();
  const { farm } = useAuth();
  const { batches, loading: batchesLoading } = useBatches();

  // Per-batch logs plus the farm's feed purchases, loaded in groups of two
  // batches (farmData.js: firing every request at once trips Lambda
  // concurrency limits). Completed batches only need their feed usage, which
  // still counts against the shared feed store.
  const [logsByBatch, setLogsByBatch] = useState({});
  const [purchases, setPurchases] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (batchesLoading) return undefined;
    let cancelled = false;

    async function load() {
      setLoadState((s) => (s === 'ready' ? 'ready' : 'loading'));
      const list = (p) => safe(p.then((r) => r.logs || r.entries || []), null);
      const perBatch = await inGroups(batches, BATCHES_PER_GROUP, async (b) => {
        if (!isActive(b)) {
          return [b.batchId, { mortality: [], feed: (await list(getLogs(b.batchId, 'feed'))) || [], eggs: [], vaccinations: [], schedule: [] }];
        }
        const [mortality, feed, eggs, vaccinations, schedule] = await Promise.all([
          list(getLogs(b.batchId, 'mortality')),
          list(getLogs(b.batchId, 'feed')),
          laysEggs(b.type) ? list(getLogs(b.batchId, 'eggs')) : Promise.resolve([]),
          list(getVaccinationRecords(b.batchId)),
          safe(getSchedule(b.batchId).then((r) => r.schedule || []), null),
        ]);
        return [b.batchId, { mortality, feed, eggs, vaccinations, schedule }];
      });
      const bought = await safe(getFeedPurchases(), null);
      if (cancelled) return;

      const anyLoaded = perBatch.some(([, l]) => l.mortality || l.feed || l.schedule);
      setLogsByBatch(Object.fromEntries(perBatch));
      setPurchases(bought);
      setLoadState(batches.length > 0 && !anyLoaded && bought === null ? 'error' : 'ready');
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [batches, batchesLoading, reloadKey]);

  // Anything saved elsewhere (a modal here, or another tab) refreshes the numbers.
  useEffect(() => {
    window.addEventListener(LOGS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(LOGS_CHANGED_EVENT, reload);
  }, [reload]);

  const loading = batchesLoading || loadState === 'loading';
  const today = toIso(new Date());

  // Same order as the Batches page: active only here, newest first.
  const activeBatches = useMemo(
    () =>
      batches
        .filter(isActive)
        .sort((a, b) => new Date(b.startDate || b.createdAt || 0) - new Date(a.startDate || a.createdAt || 0)),
    [batches]
  );

  const currentBirdsOf = useCallback(
    (b) => {
      const mortality = logsByBatch[b.batchId]?.mortality;
      if (!mortality) return Number(b.currentBirds ?? b.birdCount) || 0;
      const lost = mortality.reduce((s, m) => s + (Number(m.count) || 0), 0);
      return Math.max(0, (Number(b.birdCount) || 0) - lost);
    },
    [logsByBatch]
  );

  // ---- summary metrics -----------------------------------------------------------
  const weekAgo = isoDaysAgo(6);
  const startedThisWeek = activeBatches.filter((b) => (b.startDate || b.createdAt || '').slice(0, 10) >= weekAgo).length;
  const totalBirds = activeBatches.reduce((s, b) => s + currentBirdsOf(b), 0);
  const lostThisWeek = activeBatches.reduce(
    (s, b) =>
      s +
      (logsByBatch[b.batchId]?.mortality || [])
        .filter((m) => m.date && m.date >= weekAgo)
        .reduce((t, m) => t + (Number(m.count) || 0), 0),
    0
  );

  const feed = useMemo(() => {
    if (purchases === null) return null;
    const usage = Object.values(logsByBatch).flatMap((l) => l.feed || []);
    const { lines } = computeFeedStock(purchases, usage);
    return {
      bought: purchases.length > 0,
      bags: lines.reduce((s, l) => s + Math.max(l.left, 0), 0),
      kg: lines.reduce((s, l) => s + Math.max(l.left, 0) * l.bagSizeKg, 0),
      low: lines.filter((l) => l.status !== 'ok').length,
    };
  }, [purchases, logsByBatch]);

  const vaccines = useMemo(() => {
    const schedules = activeBatches.flatMap((b) =>
      (logsByBatch[b.batchId]?.schedule || []).map((s) => ({ ...s, batchId: b.batchId }))
    );
    const open = schedules.filter((s) => s.dueDate && s.status !== 'done' && s.status !== 'missed');
    const upcoming = open.filter((s) => s.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const overdue = schedules.filter((s) => s.dueDate && s.status !== 'done' && (s.status === 'missed' || s.dueDate < today));
    return { upcoming, overdue: overdue.length };
  }, [activeBatches, logsByBatch, today]);

  // ---- batches -----------------------------------------------------------------
  const visibleBatches = activeBatches.slice(0, MAX_VISIBLE_BATCHES);
  const eggsPerDayOf = (b) => {
    const recent = (logsByBatch[b.batchId]?.eggs || []).filter((e) => e.date && e.date >= weekAgo);
    if (recent.length === 0) return null;
    return Math.round(recent.reduce((s, e) => s + eggCount(e), 0) / 7);
  };

  // ---- recent activity -------------------------------------------------------------
  const [activityExpanded, setActivityExpanded] = useState(false);
  const activity = useMemo(() => {
    const byId = Object.fromEntries(batches.map((b) => [b.batchId, b]));
    const items = [];
    Object.entries(logsByBatch).forEach(([batchId, l]) => {
      const b = byId[batchId];
      if (!b) return;
      const base = { batchId, closed: !isActive(b), batchName: b.name };
      (l.feed || []).forEach((e) =>
        items.push({ ...base, type: 'feed', at: e.createdAt || e.date, title: 'Feed logged', sub: `${b.name} • ${formatBags(feedBags(e))}` })
      );
      (l.eggs || []).forEach((e) =>
        items.push({ ...base, type: 'eggs', at: e.createdAt || e.date, title: 'Eggs recorded', sub: `${b.name} • ${eggCount(e).toLocaleString()} eggs` })
      );
      (l.vaccinations || []).forEach((e) =>
        items.push({ ...base, type: 'vaccination', at: e.createdAt || e.dateAdministered || e.date, title: 'Vaccination recorded', sub: `${b.name} • ${e.vaccineName || 'Vaccine'}` })
      );
      (l.mortality || []).forEach((e) =>
        items.push({ ...base, type: 'mortality', at: e.createdAt || e.date, title: 'Birds lost recorded', sub: `${b.name} • ${Number(e.count) || 0} bird${Number(e.count) === 1 ? '' : 's'}` })
      );
    });
    batches.forEach((b) =>
      items.push({ batchId: b.batchId, closed: !isActive(b), type: 'batch', at: b.createdAt || b.startDate, title: 'New batch created', sub: b.name })
    );
    return items
      .map((i) => ({ ...i, ms: Date.parse(i.at) }))
      .filter((i) => !Number.isNaN(i.ms))
      .sort((a, b) => b.ms - a.ms)
      .slice(0, ACTIVITY_EXPANDED);
  }, [batches, logsByBatch]);
  const shownActivity = activity.slice(0, activityExpanded ? ACTIVITY_EXPANDED : ACTIVITY_COLLAPSED);

  // ---- production performance -----------------------------------------------------------
  const [perfBatchId, setPerfBatchId] = useState('');
  const perfBatch = activeBatches.find((b) => b.batchId === perfBatchId) || activeBatches[0] || null;
  const [weightByBatch, setWeightByBatch] = useState({});
  const perfNeedsWeight = perfBatch && ['meat', 'dual'].includes(birdPurpose(perfBatch.type));

  useEffect(() => {
    if (!perfNeedsWeight || weightByBatch[perfBatch.batchId] !== undefined) return undefined;
    let cancelled = false;
    getLogs(perfBatch.batchId, 'weight')
      .then((r) => r.logs || [])
      .catch(() => [])
      .then((list) => {
        if (!cancelled) setWeightByBatch((prev) => ({ ...prev, [perfBatch.batchId]: list }));
      });
    return () => {
      cancelled = true;
    };
  }, [perfNeedsWeight, perfBatch, weightByBatch]);

  const perf =
    perfBatch && !loading
      ? buildPerformance(perfBatch, logsByBatch[perfBatch.batchId], weightByBatch[perfBatch.batchId] ?? null, currentBirdsOf(perfBatch))
      : null;

  // ---- quick actions ---------------------------------------------------------------
  const [modal, setModal] = useState(null); // 'feed' | 'feedStock' | 'vaccine' | 'lossPicker'
  const healthEvents = useMemo(
    () =>
      buildHealthEvents({
        schedules: activeBatches.flatMap((b) => (logsByBatch[b.batchId]?.schedule || []).map((s) => ({ ...s, batchId: b.batchId }))),
        records: activeBatches.flatMap((b) => (logsByBatch[b.batchId]?.vaccinations || []).map((r) => ({ ...r, batchId: b.batchId }))),
        supplements: loadSupplements(),
        batchNames: Object.fromEntries(batches.map((b) => [b.batchId, b.name])),
      }),
    [activeBatches, batches, logsByBatch]
  );

  const logBirdLoss = () => {
    if (activeBatches.length === 1) navigate(`/batches/${activeBatches[0].batchId}?log=mortality`);
    else setModal('lossPicker');
  };
  const noActive = activeBatches.length === 0;

  // Onboarding no longer creates a batch, so a farm with none at all is
  // prompted here. "Later" hides it for this browser session only.
  const [firstBatchDismissed, setFirstBatchDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(FIRST_BATCH_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const showFirstBatchPrompt = !batchesLoading && batches.length === 0 && !firstBatchDismissed;
  const dismissFirstBatchPrompt = () => {
    setFirstBatchDismissed(true);
    try {
      sessionStorage.setItem(FIRST_BATCH_DISMISSED_KEY, '1');
    } catch {
      // Hidden until the page reloads.
    }
  };

  const firstName = (farm?.farmerName || '').trim().split(/\s+/)[0];

  // ---- render ----------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12 text-[#142033]">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-[26px] font-semibold font-heading leading-tight">
          {firstName ? `Hi, ${firstName}` : 'Hi there'}
        </h1>
        <p className="text-sm text-[#70829B] mt-1">Here's what's happening on your farm today.</p>
      </div>

      {loadState === 'error' && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>Some farm records could not be loaded, so a few numbers may be missing.</span>
          <button type="button" onClick={reload} className="inline-flex items-center gap-1.5 font-semibold cursor-pointer shrink-0">
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      )}

      {/* 1. Your Batches, with Quick Actions beside it (stacked below xl) */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] gap-5 items-stretch">
        {/* Your Batches */}
        <Card className="p-4 sm:p-5">
          <SectionHeader icon={BatchIcon} title="Your Batches" action={<ViewAll to="/batches" />} />
          <div className="h-32 sm:h-40 rounded-xl overflow-hidden bg-stone-100">
            <img src={BATCH_BANNER} alt="Hens on a poultry farm" className="w-full h-full object-cover object-[center_45%]" />
          </div>

          {batchesLoading ? (
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : noActive ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#E1E8EF] p-6 text-center">
              <p className="text-sm font-semibold">No active batches</p>
              <p className="text-xs text-[#70829B] mt-1">Start a batch to begin tracking birds, feed and vaccinations.</p>
              <Link
                to="/batches/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#DFFF83] text-[#17191A] text-sm font-semibold hover:bg-[#C5E95A] transition-colors"
              >
                <Plus size={16} /> Create New Batch
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {visibleBatches.map((b) => (
                <BatchCard
                  key={b.batchId}
                  batch={b}
                  currentBirds={currentBirdsOf(b)}
                  eggsPerDay={eggsPerDayOf(b)}
                  logsLoaded={!loading}
                  onOpen={() => navigate(`/batches/${b.batchId}`)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-4 sm:p-5 w-full h-full flex flex-col">
          <SectionHeader icon={Zap} title="Quick Actions" />
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 auto-rows-fr gap-3 flex-1">
            <QuickAction icon={Plus} filledIcon title="Create Batch" hint="Start a new batch" tone="green" to="/batches/new" />
            <QuickAction
              icon={FeedIcon}
              title="Log Feed"
              hint={noActive ? 'Needs an active batch' : 'Record feed usage'}
              tone="blue"
              disabled={noActive}
              onClick={() => setModal('feed')}
            />
            <QuickAction
              icon={VaccineIcon}
              title="Record Vaccination"
              hint={noActive ? 'Needs an active batch' : 'Update vaccination records'}
              tone="blue"
              disabled={noActive}
              onClick={() => setModal('vaccine')}
            />
            <QuickAction
              icon={BirdIcon}
              title="Log Bird Loss"
              hint={noActive ? 'Needs an active batch' : 'Record mortality/loss'}
              tone="red"
              disabled={noActive}
              onClick={logBirdLoss}
            />
          </div>
        </Card>
      </div>

      {/* 2. Summary cards */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          icon={BatchIcon}
          label="Active Batches"
          value={activeBatches.length.toLocaleString()}
          detail={startedThisWeek > 0 ? `+${startedThisWeek} started this week` : 'No new batches this week'}
          detailIcon={startedThisWeek > 0 ? TrendingUp : null}
          detailTone={startedThisWeek > 0 ? 'good' : 'muted'}
          loading={batchesLoading}
          tone="green"
        />
        <SummaryCard
          icon={BirdIcon}
          label="Total Birds"
          value={totalBirds.toLocaleString()}
          detail={lostThisWeek > 0 ? `${lostThisWeek.toLocaleString()} lost this week` : 'No losses this week'}
          detailIcon={lostThisWeek > 0 ? TrendingDown : null}
          detailTone={lostThisWeek > 0 ? 'bad' : 'muted'}
          loading={loading}
          tone="blue"
        />
        <SummaryCard
          icon={FeedIcon}
          label="Feed Stock"
          value={feed == null || !feed.bought ? '—' : formatBags(feed.bags)}
          detail={
            feed == null
              ? 'Feed store unavailable'
              : !feed.bought
                ? 'Add feed you buy in Inventory'
                : feed.low > 0
                  ? `${Math.round(feed.kg).toLocaleString()} kg • ${feed.low} running low`
                  : `${Math.round(feed.kg).toLocaleString()} kg in store`
          }
          detailTone={feed?.low > 0 ? 'warn' : 'muted'}
          loading={loading}
          tone="green"
        />
        <SummaryCard
          icon={VaccineIcon}
          label="Upcoming Vaccinations"
          value={vaccines.upcoming.length.toLocaleString()}
          detail={
            vaccines.upcoming.length > 0
              ? dueWhen(daysUntil(vaccines.upcoming[0].dueDate, today))
              : vaccines.overdue > 0
                ? `${vaccines.overdue} overdue`
                : 'None scheduled'
          }
          detailIcon={CalendarIcon}
          detailTone={vaccines.overdue > 0 && vaccines.upcoming.length === 0 ? 'bad' : 'muted'}
          loading={loading}
          tone="blue"
        />
      </div>

      {/* 3. Production Performance (wider: what farmers act on) and Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5">
          <Card className="p-4 sm:p-5 flex flex-col">
            <SectionHeader
              icon={ChartLine}
              title="Production Performance"
              action={
                activeBatches.length > 0 && (
                  <label className="relative shrink-0">
                    <span className="sr-only">Choose batch</span>
                    <select
                      value={perfBatch?.batchId || ''}
                      onChange={(e) => setPerfBatchId(e.target.value)}
                      className="appearance-none bg-transparent pr-5 pl-1 py-1 text-xs font-medium text-[#142033] cursor-pointer max-w-[130px] truncate focus:outline-none focus:ring-2 focus:ring-[#DFFF83]/70 rounded-md"
                    >
                      {activeBatches.map((b) => (
                        <option key={b.batchId} value={b.batchId}>{b.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[#142033]/70" />
                  </label>
                )
              }
            />
            {noActive ? (
              <EmptyNote>Performance appears once you have an active batch.</EmptyNote>
            ) : !perf || perf.loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
              </div>
            ) : perf.empty ? (
              <>
                <div className="text-xs font-medium text-[#70829B] mb-1">{perf.title}</div>
                <EmptyNote>{perf.empty}</EmptyNote>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-[#F7F9FA] px-4 py-3">
                  <div className="text-xs font-medium text-[#142033]">
                    {perf.title} <span className="text-[#70829B] font-normal">• {perf.caption}</span>
                  </div>
                  <div className="flex items-end justify-between gap-3 mt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[26px] font-semibold font-heading leading-none tabular-nums">{perf.value}</span>
                      <span className="text-sm text-[#70829B]">{perf.suffix}</span>
                    </div>
                    {perf.change && (
                      <span className={`inline-flex items-center gap-1 text-[11px] ${perf.change.up ? 'text-[#4D6600]' : 'text-rose-600'}`}>
                        {perf.change.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {perf.change.text}
                      </span>
                    )}
                  </div>
                  {perf.extras?.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-[#70829B]">
                      {perf.extras.map((x) => (
                        <span key={x.label}>
                          {x.label}: <strong className="font-semibold text-[#142033]">{x.value}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  {perf.points ? (
                    <LineChart points={perf.points} formatTick={perf.formatTick} />
                  ) : (
                    <EmptyNote>{perf.thin}</EmptyNote>
                  )}
                </div>
              </>
            )}
          </Card>

          <Card className="p-4 sm:p-5 flex flex-col">
            <SectionHeader
              icon={HistoryIcon}
              title="Recent Activity"
              action={
                activity.length > ACTIVITY_COLLAPSED && (
                  <ViewAll onClick={() => setActivityExpanded((v) => !v)}>
                    {activityExpanded ? 'Show less' : 'View all'}
                  </ViewAll>
                )
              }
            />
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-11 h-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : shownActivity.length === 0 ? (
              <EmptyNote>No activity logged yet.</EmptyNote>
            ) : (
              <ul className="divide-y divide-[#E1E8EF]">
                {shownActivity.map((item, i) => {
                  const style = ACTIVITY_STYLE[item.type] || { icon: Clock, tint: 'bg-stone-100' };
                  return (
                    <li key={`${item.type}-${item.batchId}-${item.ms}-${i}`}>
                      <Link
                        to={item.closed ? `/history/${item.batchId}` : `/batches/${item.batchId}`}
                        className="flex items-center gap-3 py-3 group"
                      >
                        <TintedIcon tint={style.tint} icon={style.icon} size={18} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{item.title}</div>
                          <div className="text-xs text-[#70829B] truncate">{item.sub}</div>
                          <div className="text-[11px] text-[#70829B]/90 truncate">{stamp(item.at)}</div>
                        </div>
                        <ChevronRight size={16} className="text-[#70829B] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
      </div>

      {/* Existing logging flows, reused as-is */}
      <FeedUsageModal
        isOpen={modal === 'feed'}
        onClose={() => setModal(null)}
        onAddStock={() => setModal('feedStock')}
      />
      <FeedPurchaseModal
        isOpen={modal === 'feedStock'}
        onClose={() => setModal('feed')}
        onSaved={reload}
      />
      <VaccinationModal
        isOpen={modal === 'vaccine'}
        onClose={() => setModal(null)}
        // A recorded vaccination is a log entry and already fires the
        // logs-changed refresh; a scheduled one is not, so reload for it here.
        onSaved={({ mode }) => mode === 'schedule' && reload()}
        batches={activeBatches}
        events={healthEvents}
        prefill={RECORD_PREFILL}
      />

      {/* First visit after onboarding: nudge towards the first batch. */}
      <Modal
        open={showFirstBatchPrompt}
        title="Create your first batch"
        onClose={dismissFirstBatchPrompt}
        actions={
          <>
            <button
              type="button"
              onClick={dismissFirstBatchPrompt}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#70829B] hover:text-[#142033] cursor-pointer"
            >
              Later
            </button>
            <Link
              to="/batches/new"
              onClick={dismissFirstBatchPrompt}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Create batch
            </Link>
          </>
        }
      >
        <p>
          Your farm is set up. A batch is one group of birds you raise together, for example the 500 layers you
          placed this month.
        </p>
        <p className="mt-2">
          Create your first batch to start recording feed, eggs, vaccinations and bird losses.
        </p>
      </Modal>

      {/* Bird loss is recorded on the batch page's own form; this only picks the batch. */}
      <Modal open={modal === 'lossPicker'} title="Log bird loss for which batch?" onClose={() => setModal(null)}>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {activeBatches.map((b) => (
            <button
              key={b.batchId}
              type="button"
              onClick={() => {
                setModal(null);
                navigate(`/batches/${b.batchId}?log=mortality`);
              }}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-[#E1E8EF] px-4 py-3 text-left hover:border-[#B7DA3E] hover:bg-[#F7FFE0] transition-colors cursor-pointer"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#142033] truncate">{b.name}</span>
                <span className="block text-xs text-[#70829B]">
                  {birdTypeLabel(b.type)} • {currentBirdsOf(b).toLocaleString()} birds
                </span>
              </span>
              <ChevronRight size={16} className="text-[#70829B] shrink-0" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

export default DashboardPage;
