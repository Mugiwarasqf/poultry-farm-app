import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Egg,
  Wheat,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { useBatches } from '../context/BatchContext';
import { getLogs } from '../api/logs';
import { BirdIcon } from '../components/ui/BirdIcon';
import { EGGS_PER_CRATE, batchAge, batchImage, daysActive, formatDate, typePillClass } from '../lib/batch';

const TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'layer', label: 'Layer' },
  { value: 'broiler', label: 'Broiler' },
  { value: 'chick', label: 'Chick' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Completed' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Sort by: Newest' },
  { value: 'oldest', label: 'Sort by: Oldest' },
  { value: 'name', label: 'Sort by: Name' },
];

function isClosed(batch) {
  return batch.status === 'closed';
}

/** Which log resource a batch type needs to compute its headline metric. */
function metricResource(type) {
  if (type === 'layer') return 'eggs';
  if (type === 'broiler') return 'feed';
  return 'mortality';
}

function Dropdown({ value, onChange, options, ariaLabel }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="appearance-none w-full bg-white border border-stone-200 rounded-xl pl-4 pr-10 py-3 text-sm font-medium text-stone-700 shadow-xs cursor-pointer focus:outline-hidden focus:border-stone-400 transition-colors"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={2.5}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-4 sm:p-5 flex items-center gap-4">
      <Icon size={26} strokeWidth={2} className="text-stone-900 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs sm:text-sm text-stone-500 truncate">{label}</div>
        <div className="text-xl sm:text-2xl font-bold text-stone-950 font-heading mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, detail }) {
  return (
    <div className="bg-stone-50 border border-stone-100 rounded-lg p-3.5 flex items-center gap-3">
      <Icon size={20} strokeWidth={2} className="text-stone-700 shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] text-stone-500 truncate">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-stone-950 font-heading">{value}</span>
          {detail && <span className="text-[11px] text-stone-400 truncate">{detail}</span>}
        </div>
      </div>
    </div>
  );
}

function BatchCard({ batch, metric }) {
  const type = (batch.type || 'other').toLowerCase();
  const closed = isClosed(batch);

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col">
      <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start gap-4">
          <img
            src={batchImage(batch)}
            alt={batch.name}
            className="w-24 h-24 rounded-lg object-cover bg-stone-100 shrink-0"
          />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-stone-950 font-heading truncate">
                {batch.name}
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                  closed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                {closed ? 'Completed' : 'Active'}
              </span>
            </div>

            <div>
              <span className={typePillClass(type)}>{type}</span>
            </div>

            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <BirdIcon size={13} strokeWidth={2.5} className="text-stone-500 shrink-0" />
                <span>{Number(batch.birdCount || 0).toLocaleString()} birds</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={13} strokeWidth={2.5} className="text-stone-500 shrink-0" />
                <span>
                  Age: <strong className="font-semibold text-stone-800">{batchAge(batch)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={13} strokeWidth={2.5} className="text-stone-500 shrink-0" />
                <span className="truncate">
                  {formatDate(batch.startDate)} – {batch.closedAt ? formatDate(batch.closedAt) : 'Ongoing'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={13} strokeWidth={2.5} className="text-stone-500 shrink-0" />
                <span className="truncate">{batch.housing || 'No house recorded'}</span>
              </div>
            </div>
          </div>
        </div>

        <MetricBox {...metric} />
      </div>

      <Link
        to={`/batches/${batch.batchId}`}
        className="border-t border-stone-100 px-4 sm:px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-stone-900 hover:bg-stone-50 rounded-b-xl transition-colors"
      >
        <span>View Details</span>
        <ChevronRight size={16} strokeWidth={2.5} className="text-stone-400" />
      </Link>
    </div>
  );
}

export function BatchesPage() {
  const { batches, loading } = useBatches();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [metrics, setMetrics] = useState({});

  // Each card's headline figure comes from that batch's own logs. Only the one
  // resource a type actually needs is fetched (eggs for layers, feed for
  // broilers, mortality for chicks) rather than all three per batch.
  useEffect(() => {
    if (batches.length === 0) return undefined;
    let cancelled = false;

    async function load() {
      const entries = await Promise.all(
        batches.map(async (batch) => {
          const resource = metricResource((batch.type || '').toLowerCase());
          try {
            const res = await getLogs(batch.batchId, resource);
            return [batch.batchId, res.entries || []];
          } catch {
            return [batch.batchId, []];
          }
        })
      );
      if (!cancelled) setMetrics(Object.fromEntries(entries));
    }

    load();
    return () => { cancelled = true; };
  }, [batches]);

  const stats = useMemo(() => {
    const completed = batches.filter(isClosed).length;
    return {
      total: batches.length,
      completed,
      active: batches.length - completed,
      birds: batches.reduce((sum, b) => sum + (Number(b.birdCount) || 0), 0),
    };
  }, [batches]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = batches.filter((batch) => {
      const type = (batch.type || '').toLowerCase();
      const matchesType = typeFilter === 'all' || type === typeFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'closed' ? isClosed(batch) : !isClosed(batch));
      const matchesQuery = !q || (batch.name || '').toLowerCase().includes(q);
      return matchesType && matchesStatus && matchesQuery;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      const aDate = new Date(a.startDate || a.createdAt || 0);
      const bDate = new Date(b.startDate || b.createdAt || 0);
      return sort === 'oldest' ? aDate - bDate : bDate - aDate;
    });
    return sorted;
  }, [batches, query, typeFilter, statusFilter, sort]);

  /**
   * The reference design shows "Total Weight Gain" for broilers and a
   * "Growth Rate" percentage for chicks. Neither can be computed: nothing in
   * the data model records bird weight. Rather than invent numbers, each type
   * shows the nearest figure its logs genuinely support.
   */
  const metricFor = (batch) => {
    const type = (batch.type || '').toLowerCase();
    const entries = metrics[batch.batchId] || [];
    const birds = Number(batch.birdCount) || 0;
    const days = daysActive(batch.startDate, batch.closedAt);

    if (type === 'layer') {
      const total = entries.reduce(
        (sum, e) => sum + (Number(e.crates) || 0) * EGGS_PER_CRATE + (Number(e.looseEggs) || 0),
        0
      );
      return {
        icon: Egg,
        label: 'Total Eggs Collected',
        value: total.toLocaleString(),
        detail: days ? `(avg. ${Math.round(total / days).toLocaleString()}/day)` : null,
      };
    }

    if (type === 'broiler') {
      const totalKg = entries.reduce((sum, e) => sum + (Number(e.amountKg) || 0), 0);
      return {
        icon: Wheat,
        label: 'Total Feed Used',
        value: `${totalKg.toLocaleString()} kg`,
        detail: birds ? `(avg. ${(totalKg / birds).toFixed(1)} kg/bird)` : null,
      };
    }

    const lost = entries.reduce((sum, e) => sum + (Number(e.count) || 0), 0);
    const survival = birds ? Math.round(((birds - lost) / birds) * 100) : null;
    return {
      icon: TrendingUp,
      label: 'Survival Rate',
      value: survival != null ? `${survival}%` : '—',
      detail: `(${lost.toLocaleString()} lost)`,
    };
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-heading">All Batches</h1>
          <p className="text-sm text-stone-500 mt-1.5 max-w-2xl leading-relaxed">
            View and manage all your poultry batches. Click on a batch to see detailed information,
            logs and performance.
          </p>
        </div>

        <Link
          to="/batches/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Create New Batch</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-3">
        <div className="relative">
          <Search
            size={16}
            strokeWidth={3}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search batches..."
            className="w-full bg-white border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 shadow-xs focus:outline-hidden focus:border-stone-400 transition-colors"
          />
        </div>

        <Dropdown value={typeFilter} onChange={setTypeFilter} options={TYPE_FILTERS} ariaLabel="Filter by type" />
        <Dropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} ariaLabel="Filter by status" />
        <Dropdown value={sort} onChange={setSort} options={SORT_OPTIONS} ariaLabel="Sort batches" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BirdIcon} label="Total Batches" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Completed Batches" value={stats.completed} />
        <StatCard icon={Clock} label="Active Batches" value={stats.active} />
        <StatCard icon={BirdIcon} label="Total Birds" value={stats.birds.toLocaleString()} />
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-stone-400">Loading batches…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-xl border border-stone-200 shadow-xs">
          <div className="w-14 h-14 mx-auto bg-stone-100 rounded-xl flex items-center justify-center mb-3">
            <Layers size={24} strokeWidth={2.5} className="text-stone-400" />
          </div>
          <h3 className="text-base font-bold text-stone-900 font-heading mb-1">
            {batches.length === 0 ? 'No batches yet' : 'No batches match your filters'}
          </h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto mb-6">
            {batches.length === 0
              ? 'Create your first batch to start tracking birds, feed and production.'
              : 'Try a different search, or set the filters back to All.'}
          </p>
          {batches.length === 0 && (
            <Link
              to="/batches/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Create New Batch</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visible.map((batch) => (
            <BatchCard key={batch.batchId} batch={batch} metric={metricFor(batch)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default BatchesPage;
