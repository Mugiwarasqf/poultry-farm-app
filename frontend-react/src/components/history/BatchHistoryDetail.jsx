import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  Egg,
  Loader2,
  MapPin,
  Package,
  Percent,
  ShoppingCart,
  Skull,
  Syringe,
  TrendingDown,
  TrendingUp,
  Wheat,
  FileText,
} from 'lucide-react';
import { getLogs } from '../../api/logs';
import { BirdIcon } from '../ui/BirdIcon';
import {
  COMPLETED_PILL_CLASS,
  EGGS_PER_CRATE,
  batchImage,
  daysActive,
  formatDate,
  formatPercent,
  typePillClass,
  birdTypeLabel,
  feedBags,
  formatBags,
} from '../../lib/batch';

const TABS = ['Overview', 'Production', 'Feed', 'Health', 'Vaccination', 'Notes'];

/**
 * Pulls every log type for one batch and rolls them into the lifetime figures
 * the History detail shows. There's no stored per-batch summary on the
 * backend — GET /farms/{id}/summary is a rolling farm-wide window — so this
 * aggregates the same log records the batch detail page already reads.
 */
function useBatchHistoryDetail(batchId) {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!batchId) return undefined;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getLogs(batchId, 'mortality').catch(() => ({ entries: [] })),
      getLogs(batchId, 'feed').catch(() => ({ entries: [] })),
      getLogs(batchId, 'eggs').catch(() => ({ entries: [] })),
      getLogs(batchId, 'vaccinations').catch(() => ({ entries: [] })),
    ])
      .then(([mortality, feed, eggs, vaccinations]) => {
        if (cancelled) return;
        setLogs({
          mortality: mortality.entries || [],
          feed: feed.entries || [],
          eggs: eggs.entries || [],
          vaccinations: vaccinations.entries || [],
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [batchId]);

  return { logs, loading };
}

function eggCount(entry) {
  return (Number(entry.crates) || 0) * EGGS_PER_CRATE + (Number(entry.looseEggs) || 0);
}

function useBatchStats(batch, logs) {
  return useMemo(() => {
    const totalBirds = Number(batch?.birdCount) || 0;
    const days = daysActive(batch?.startDate, batch?.closedAt);
    const isLayer = (batch?.type || '').toLowerCase() === 'layer';

    if (!logs) {
      return { totalBirds, days, isLayer };
    }

    const birdsLost = logs.mortality.reduce((sum, e) => sum + (Number(e.count) || 0), 0);
    const totalEggs = logs.eggs.reduce((sum, e) => sum + eggCount(e), 0);
    const totalFeedBags = logs.feed.reduce((sum, e) => sum + feedBags(e), 0);

    // Peak day = the best single calendar day, so multiple entries logged on
    // the same day count together rather than competing with each other.
    const eggsByDay = new Map();
    for (const entry of logs.eggs) {
      if (!entry.date) continue;
      eggsByDay.set(entry.date, (eggsByDay.get(entry.date) || 0) + eggCount(entry));
    }
    const peakEggDay = eggsByDay.size > 0 ? Math.max(...eggsByDay.values()) : null;

    return {
      totalBirds,
      days,
      isLayer,
      birdsLost,
      birdsSold: Math.max(0, totalBirds - birdsLost),
      lossPercent: formatPercent(birdsLost, totalBirds),
      totalEggs,
      avgEggsPerDay: isLayer && days ? Math.round(totalEggs / days) : null,
      totalFeedBags,
      peakEggDay,
      vaccinationCount: logs.vaccinations.length,
    };
  }, [batch, logs]);
}

function StatTile({ icon: Icon, label, value, suffix, hint }) {
  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-2 text-stone-500">
        <Icon size={15} strokeWidth={2.5} className="text-stone-400 shrink-0" />
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

function InsightRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon size={15} strokeWidth={2.5} className="text-stone-400 shrink-0" />
        <span className="text-sm text-stone-600 truncate">{label}</span>
      </div>
      <span className="text-sm font-semibold text-stone-900 shrink-0">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-5 flex items-center gap-4">
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

function LogRow({ primary, secondary, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-stone-800 truncate">{primary}</div>
        {secondary && <div className="text-xs text-stone-500 truncate mt-0.5">{secondary}</div>}
      </div>
      {value && <span className="text-sm font-semibold text-stone-900 shrink-0">{value}</span>}
    </div>
  );
}

export function BatchHistoryDetail({ batch, onBack, className = '' }) {
  const [tab, setTab] = useState('Overview');
  const { logs, loading } = useBatchHistoryDetail(batch?.batchId);
  const stats = useBatchStats(batch, logs);

  // A different batch means the previously open tab may not make sense.
  useEffect(() => {
    setTab('Overview');
  }, [batch?.batchId]);

  if (!batch) return null;

  const type = (batch.type || 'other').toLowerCase();
  const dateRange = `${formatDate(batch.startDate)} – ${batch.closedAt ? formatDate(batch.closedAt) : 'Closed'}`;

  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-5 sm:p-6 space-y-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            <span>Back to History</span>
          </button>
        )}

        <div className="flex items-start gap-4">
          <img
            src={batchImage(batch)}
            alt={batch.name}
            className="w-16 h-16 rounded-lg object-cover bg-stone-100 shrink-0"
          />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-stone-950 font-heading truncate">
                  {batch.name}
                </h2>
                <span className={typePillClass(type)}>
                  {birdTypeLabel(type)}
                </span>
              </div>
              <span className={`${COMPLETED_PILL_CLASS} shrink-0`}>
                Completed
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-stone-500">
              <Calendar size={13} strokeWidth={3} className="text-stone-500 shrink-0" />
              <span className="truncate">{dateRange}</span>
            </div>

            <div className="flex items-center gap-4 text-sm text-stone-500 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <BirdIcon size={13} strokeWidth={3} className="text-stone-500 shrink-0" />
                {stats.totalBirds.toLocaleString()} birds
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} strokeWidth={3} className="text-stone-500 shrink-0" />
                {batch.housing || 'No house recorded'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 px-5 sm:px-6">
        {/* Plain text tabs with an underline on the active one — they wrap if
            the panel gets narrow rather than sitting in a scroll container,
            which would put a scrollbar right under the underline. */}
        <div className="flex flex-wrap gap-x-5">
          {TABS.map((item) => {
            const isActive = item === tab;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`relative py-3 text-sm whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-px ${
                  isActive
                    ? 'border-stone-900 text-stone-950 font-semibold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm text-stone-400">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading batch records…</span>
          </div>
        ) : (
          /* key={tab} remounts this subtree on every tab switch, which is what
             restarts the CSS enter animation — without it the panel would swap
             instantly and the animation would only ever play once. */
          <div key={tab} className="animate-tab-panel">
            {tab === 'Overview' && <OverviewTab batch={batch} stats={stats} />}

            {tab === 'Production' && (
              logs.eggs.length === 0 ? (
                <EmptyState
                  icon={Egg}
                  title="No egg production recorded for this batch."
                  description="Egg production is only available for layer batches."
                />
              ) : (
                <div className="divide-y divide-stone-100">
                  {logs.eggs.map((entry) => (
                    <LogRow
                      key={entry.entryId}
                      primary={formatDate(entry.date)}
                      secondary={`${Number(entry.crates) || 0} crates · ${Number(entry.looseEggs) || 0} loose`}
                      value={`${eggCount(entry).toLocaleString()} eggs`}
                    />
                  ))}
                </div>
              )
            )}

            {tab === 'Feed' && (
              logs.feed.length === 0 ? (
                <EmptyState icon={Wheat} title="No feed recorded for this batch." />
              ) : (
                <div className="divide-y divide-stone-100">
                  {logs.feed.map((entry) => (
                    <LogRow
                      key={entry.entryId}
                      primary={entry.feedType || 'Feed'}
                      secondary={formatDate(entry.date)}
                      value={formatBags(feedBags(entry))}
                    />
                  ))}
                </div>
              )
            )}

            {tab === 'Health' && (
              logs.mortality.length === 0 ? (
                <EmptyState icon={Skull} title="No mortality recorded for this batch." />
              ) : (
                <div className="divide-y divide-stone-100">
                  {logs.mortality.map((entry) => (
                    <LogRow
                      key={entry.entryId}
                      primary={formatDate(entry.date)}
                      secondary={entry.note}
                      value={`${Number(entry.count) || 0} birds`}
                    />
                  ))}
                </div>
              )
            )}

            {tab === 'Vaccination' && (
              logs.vaccinations.length === 0 ? (
                <EmptyState icon={Syringe} title="No vaccinations recorded for this batch." />
              ) : (
                <div className="divide-y divide-stone-100">
                  {logs.vaccinations.map((entry) => (
                    <LogRow
                      key={entry.entryId}
                      primary={entry.vaccineName || 'Vaccination'}
                      secondary={formatDate(entry.dateAdministered)}
                    />
                  ))}
                </div>
              )
            )}

            {tab === 'Notes' && (
              batch.notes ? (
                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{batch.notes}</p>
              ) : (
                <EmptyState icon={FileText} title="No notes were saved for this batch." />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ batch, stats }) {
  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <h3 className="text-base font-bold text-stone-950 font-heading">Batch Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatTile icon={BirdIcon} label="Total Birds" value={stats.totalBirds.toLocaleString()} />
          <StatTile icon={ShoppingCart} label="Birds Sold" value={stats.birdsSold.toLocaleString()} />
          <StatTile
            icon={TrendingDown}
            label="Birds Lost"
            value={stats.birdsLost.toLocaleString()}
            suffix={stats.lossPercent ? `(${stats.lossPercent})` : null}
          />
          <StatTile
            icon={CalendarClock}
            label="Days Active"
            value={stats.days != null ? `${stats.days} days` : '–'}
            hint={stats.days == null ? '(No close date recorded)' : null}
          />
          <StatTile
            icon={Egg}
            label="Average Egg Production"
            value={stats.avgEggsPerDay != null ? stats.avgEggsPerDay.toLocaleString() : '–'}
            hint={stats.isLayer ? '(Per day)' : '(Layer batches only)'}
          />
          <StatTile
            icon={Package}
            label="Total Eggs Collected"
            value={stats.totalEggs.toLocaleString()}
            hint="(Lifetime total)"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-bold text-stone-950 font-heading">Production Performance</h3>
        {stats.totalEggs > 0 ? (
          <div className="rounded-xl border border-stone-200 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <TrendingUp size={18} strokeWidth={2.5} className="text-emerald-700" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-stone-800">
                {stats.totalEggs.toLocaleString()} eggs collected over this batch's run.
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                {stats.avgEggsPerDay != null
                  ? `Averaging ${stats.avgEggsPerDay.toLocaleString()} eggs per day`
                  : 'Daily average needs a recorded close date'}
                {stats.peakEggDay != null && ` · best day ${stats.peakEggDay.toLocaleString()} eggs`}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="No egg production data available for this batch."
            description="Egg production is only available for layer batches."
          />
        )}
      </section>

      <section className="space-y-1">
        <h3 className="text-base font-bold text-stone-950 font-heading mb-2">Key Insights</h3>
        <div className="divide-y divide-stone-100">
          <InsightRow
            icon={Egg}
            label="Peak egg production (if applicable)"
            value={stats.peakEggDay != null ? `${stats.peakEggDay.toLocaleString()} eggs` : '-'}
          />
          <InsightRow icon={Percent} label="Best feed conversion rate" value="-" />
          <InsightRow
            icon={Wheat}
            label="Total feed used"
            value={stats.totalFeedBags > 0 ? formatBags(stats.totalFeedBags) : '-'}
          />
          <InsightRow icon={Syringe} label="Total vaccination records" value={stats.vaccinationCount} />
        </div>
      </section>
    </div>
  );
}

export default BatchHistoryDetail;
