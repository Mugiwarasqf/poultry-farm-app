import { useState, useEffect } from 'react';
import {
  Plus,
  ChevronRight,
  Clock,
  Pencil,
  Skull,
  PlusCircle,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBatches } from '../context/BatchContext';
import { getLogs } from '../api/logs';
// Bird imagery + the crate-to-egg factor are shared with History so the two
// pages can't drift apart when a photo gets swapped.
import { BATCH_IMAGES, EGGS_PER_CRATE, batchAge, batchImage, birdTypeLabel, feedBags, formatBags } from '../lib/batch';
import { BirdIcon } from '../components/ui/BirdIcon';
import { VaccineIcon } from '../components/ui/VaccineIcon';
import { FeedIcon } from '../components/ui/FeedIcon';
import { EggIcon } from '../components/ui/EggIcon';
import { PenIcon } from '../components/ui/PenIcon';
import { BatchIcon } from '../components/ui/BatchIcon';
import { CalendarIcon } from '../components/ui/CalendarIcon';
import { LocationIcon } from '../components/ui/LocationIcon';

// Farm cover & avatar
const COVER_IMAGE = '/images/andreas-meier-jKFpdhOLKhw-unsplash.jpg';
const AVATAR_IMAGE = '/images/hd.jpg';

// Batch cards shown before the "create new" tile — 4 real batches + 1
// create tile fills one row of 5 on the dashboard; the rest live on /batches.
const MAX_VISIBLE_BATCHES = 4;
const RECENT_ACTIVITY_LIMIT = 5;

function InsightTile({ icon: Icon, value, label, hint }) {
  return (
    <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
      <Icon size={28} className="text-stone-400 mb-2" />
      <div className="text-lg font-bold text-stone-950 font-heading truncate">{value}</div>
      <div className="text-xs text-stone-600 font-medium truncate">{label}</div>
      {hint && <div className="text-[11px] text-stone-400 truncate">{hint}</div>}
    </div>
  );
}

// Monochrome on purpose. A different colour per entry type read as status
// (red = bad, green = good) when it only ever meant "which kind of record",
// so the feed adds noise rather than meaning. The icon carries the type.
const ACTIVITY_ICONS = {
  mortality: Skull,
  feed: FeedIcon,
  eggs: EggIcon,
  vaccination: VaccineIcon,
  batch: PlusCircle,
};

function ActivityIcon({ type }) {
  const Icon = ACTIVITY_ICONS[type] || Clock;
  return (
    <div className="w-9 h-9 rounded-full bg-stone-100 text-stone-900 flex items-center justify-center shrink-0">
      <Icon size={16} strokeWidth={2.5} />
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { farm } = useAuth();
  const { batches, loading: batchesLoading } = useBatches();
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [eggsPerDay, setEggsPerDay] = useState(0);

  // Recent Activity + Quick Insights are rolled up client-side from each
  // batch's logs — there's no cross-resource activity feed on the backend,
  // just per-resource endpoints (mortality/feed/eggs/vaccinations), same
  // pattern InventoryPage already uses to aggregate across batches.
  useEffect(() => {
    if (batches.length === 0) {
      setActivity([]);
      setEggsPerDay(0);
      setActivityLoading(false);
      return;
    }
    let cancelled = false;
    setActivityLoading(true);

    async function fetchAcrossBatches(resource) {
      const nested = await Promise.all(
        batches.map(async (b) => {
          try {
            const res = await getLogs(b.batchId, resource);
            return (res.entries || []).map((e) => ({ ...e, batchName: b.name }));
          } catch {
            return [];
          }
        })
      );
      return nested.flat();
    }

    async function loadActivity() {
      try {
        const [mortalityEntries, feedEntries, eggEntries, vacEntries] = await Promise.all([
          fetchAcrossBatches('mortality'),
          fetchAcrossBatches('feed'),
          fetchAcrossBatches('eggs'),
          fetchAcrossBatches('vaccinations'),
        ]);

        if (cancelled) return;

        // `date`/`dateAdministered` is the event date the farmer chose (often
        // backdated, coarse to the day — lots of same-day ties). `createdAt`
        // is the actual insertion timestamp, so it's what "most recent
        // activity" should sort on; without it, same-day entries looked
        // like they reshuffled on every reload even though the underlying
        // data hadn't changed.
        // Every entry carries one timestamp, `at`. Sort by it, take the first
        // five. Nothing else. (The backend has no combined activity endpoint,
        // only per-resource ones, so the four lists are merged here first.)
        const combined = [
          ...mortalityEntries.map((e) => ({
            type: 'mortality',
            at: e.createdAt || e.date,
            title: 'Mortality logged',
            subtitle: `${e.count ?? 0} bird${e.count === 1 ? '' : 's'} – ${e.batchName}`,
          })),
          ...feedEntries.map((e) => ({
            type: 'feed',
            at: e.createdAt || e.date,
            title: 'Feed logged',
            subtitle: `${formatBags(feedBags(e))} – ${e.batchName}`,
          })),
          ...eggEntries.map((e) => ({
            type: 'eggs',
            at: e.createdAt || e.date,
            title: 'Eggs recorded',
            subtitle: `${e.crates ?? 0} crates – ${e.batchName}`,
          })),
          ...vacEntries.map((e) => ({
            type: 'vaccination',
            at: e.createdAt || e.dateAdministered,
            title: 'Vaccination added',
            subtitle: `${e.vaccineName || 'Vaccine'} – ${e.batchName}`,
          })),
          ...batches.map((b) => ({
            type: 'batch',
            at: b.createdAt || b.startDate,
            title: 'New batch created',
            subtitle: b.name,
          })),
        ]
          .map((item) => ({ ...item, ms: Date.parse(item.at) }))
          .filter((item) => !Number.isNaN(item.ms))
          .sort((a, b) => b.ms - a.ms)
          .slice(0, RECENT_ACTIVITY_LIMIT);

        setActivity(combined);

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const totalRecentEggs = eggEntries
          .filter((e) => e.date && new Date(e.date) >= weekAgo)
          .reduce((sum, e) => sum + (Number(e.crates) || 0) * EGGS_PER_CRATE + (Number(e.looseEggs) || 0), 0);
        setEggsPerDay(Math.round(totalRecentEggs / 7));
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    }

    loadActivity();
    return () => { cancelled = true; };
  }, [batches]);

  // Active batches are what the dashboard is about — closed ones live on /history
  const activeBatches = batches.filter((b) => (b.status || 'active') !== 'closed');
  const visibleBatches = activeBatches.slice(0, MAX_VISIBLE_BATCHES);

  // Aggregate stats (active batches only)
  const totalBirds = activeBatches.reduce((sum, b) => sum + (Number(b.currentBirds ?? b.birdCount) || 0), 0);
  const layerBatches = activeBatches.filter(b => (b.type || '').toLowerCase() === 'layer');
  const broilerBatches = activeBatches.filter(b => (b.type || '').toLowerCase() === 'broiler');
  // Pens set up in Farm Details; farms that haven't set any up yet fall back
  // to the distinct free-text housing names on their active batches.
  const pensCount = farm?.pens?.length || new Set(
    activeBatches.map((b) => (b.housing || '').trim()).filter(Boolean)
  ).size;

  // Farm display info — no made-up name or location when the farmer hasn't set one.
  const farmDisplayName = farm?.name || 'Your farm';
  const farmLocation = (farm?.location || '').trim();

  const formatPlacedDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. FARM PROFILE HEADER */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden shadow-xs">
        {/* Farm Landscape Cover Banner */}
        <div className="relative h-48 sm:h-60 lg:h-52 w-full bg-stone-900 overflow-hidden">
          <img
            src={COVER_IMAGE}
            alt="Farm landscape banner"
            className="w-full h-full object-cover object-center brightness-95"
            
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Profile Info Row with Overlapping Circular Avatar */}
        <div className="px-4 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:justify-between sm:text-left gap-4 -mt-14 sm:-mt-16 lg:-mt-6 mb-4">
            {/* Circular Profile Image overlapping banner */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:gap-5">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white shadow-md overflow-hidden bg-white shrink-0">
                <img
                  src={AVATAR_IMAGE}
                  alt={farmDisplayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/favicon.svg';
                  }}
                />
              </div>
              <div className="pt-1 sm:pt-0">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-black font-heading px-3 py-1 rounded-md inline-block">
                    {farmDisplayName}
                  </h1>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-stone-600 mt-1 font-medium flex-wrap">
                  <span>
                    {layerBatches.length > 0 ? 'Layers' : broilerBatches.length > 0 ? 'Broilers' : 'Poultry'}
                  </span>
                  <span>•</span>
                  <span>{activeBatches.length} {activeBatches.length === 1 ? 'Batch' : 'Batches'}</span>
                  <span>•</span>
                  <span>{totalBirds.toLocaleString()} birds</span>
                </div>
                {farmLocation ? (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-stone-500 mt-1.5">
                    <LocationIcon size={13} className="shrink-0" />
                    <span>{farmLocation}</span>
                  </div>
                ) : (
                  <Link
                    to="/settings/farm"
                    className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold text-[#0D5C3A] hover:underline mt-1.5"
                  >
                    <LocationIcon size={13} className="shrink-0" />
                    <span>Add your farm location</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Edit Farm Profile Button */}
            <div className="pt-1 sm:pt-0 shrink-0 w-full sm:w-auto">
              <Link
                to="/settings"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 hover:border-stone-400 transition-colors shadow-2xs"
              >
                <Pencil size={14} className="text-emerald-700" />
                <span>Edit Farm Profile</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="space-y-6">
        {/* My Batches */}
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-950 font-heading">
                  My Batches
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Click on any batch to view logs, health, vaccinations, and feed.
                </p>
              </div>

              <Link
                to="/batches"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-stone-500 hover:text-stone-900 transition-colors shrink-0"
              >
                <span>View all</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Batches Grid — 4 batches + 1 create tile per row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {visibleBatches.map((batch) => {
                const type = (batch.type || 'layer').toLowerCase();
                const isLayer = type === 'layer';
                const isChick = type === 'chick';
                const isBroiler = type === 'broiler';
                const cardImage = batchImage(batch);

                const birdCount = Number(batch.currentBirds ?? batch.birdCount ?? 0);
                const breedDisplay = batch.breed || birdTypeLabel(type);
                const ageDisplay = batchAge(batch);
                const placedDateDisplay = formatPlacedDate(batch.startDate || batch.createdAt);

                return (
                  <div
                    key={batch.batchId}
                    onClick={() => navigate(`/batches/${batch.batchId}`)}
                    className="group bg-white rounded-lg border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-stone-300 transition-all duration-200 cursor-pointer"
                  >
                    {/* Card Thumbnail Banner */}
                    <div className="relative h-20 lg:h-32 w-full bg-stone-100 overflow-hidden">
                      <img
                        src={cardImage}
                        alt={batch.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = BATCH_IMAGES.default;
                        }}
                      />
                      {/* Bird Type Pill */}
                      <div className="absolute top-1.5 right-1.5">
                        {isLayer && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] shadow-2xs">
                            Layer
                          </span>
                        )}
                        {isChick && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] shadow-2xs">
                            Chick
                          </span>
                        )}
                        {isBroiler && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF] shadow-2xs">
                            Broiler
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3 lg:p-4 space-y-1 lg:space-y-2">
                      <h3 className="text-xs lg:text-sm font-bold text-stone-900 group-hover:text-[#0D5C3A] transition-colors truncate">
                        {batch.name}
                      </h3>

                      <p className="text-[10px] lg:text-xs text-stone-500 font-medium truncate">
                        {breedDisplay} • {birdCount.toLocaleString()} birds
                      </p>

                      <div className="space-y-0.5 lg:space-y-1 pt-0.5 text-[10px] lg:text-xs text-stone-600">
                        <div className="flex items-center gap-1 truncate">
                          <Clock size={10} className="text-stone-400 shrink-0" />
                          <span className="truncate">Age: <strong className="text-stone-800 font-semibold">{ageDisplay}</strong></span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <CalendarIcon size={10} className="text-stone-400 shrink-0" />
                          <span className="truncate">Placed: <strong className="text-stone-800 font-semibold">{placedDateDisplay}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Create-new tile — a single clickable card, no nested button */}
              <Link
                to="/batches/new"
                className="bg-white rounded-lg border-2 border-dashed border-stone-200 hover:border-stone-400 p-3 flex flex-col items-center justify-center text-center transition-all duration-200 min-h-[150px] lg:min-h-[220px]"
              >
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center mb-1.5">
                  <Plus size={16} className="text-[#0D5C3A]" />
                </div>
                <h4 className="text-xs font-bold text-stone-900">
                  {activeBatches.length === 0 ? 'No batches yet?' : 'Add another'}
                </h4>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  {activeBatches.length === 0
                    ? 'Create your first batch.'
                    : 'Start a new flock.'}
                </p>
              </Link>
            </div>
          </div>

        {/* Recent Activity + Farm Overview (merged with Quick Insights) — stretched to match height */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Recent Activity — a live feed, not the same thing as /history
              (completed batches with a lifetime summary), so it doesn't
              link there and there's no separate "view all activity" page. */}
          <div className="bg-white rounded-lg border border-stone-200 shadow-xs p-5 flex flex-col">
            <h3 className="text-base font-bold text-stone-950 font-heading mb-1">Recent Activity</h3>
            {activityLoading ? (
              <div className="flex-1 flex items-center justify-center text-xs text-stone-400">Loading activity…</div>
            ) : activity.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-stone-400">No activity logged yet.</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {activity.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <ActivityIcon type={item.type} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-stone-900 truncate">{item.title}</div>
                      <div className="text-xs text-stone-500 truncate">{item.subtitle}</div>
                    </div>
                    <div className="text-xs text-stone-400 shrink-0">{formatPlacedDate(item.at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Farm Overview — the four farm-wide numbers */}
          <div className="bg-white rounded-lg border border-stone-200 shadow-xs p-5 flex flex-col">
            <h3 className="text-base font-bold text-stone-950 font-heading mb-3">Farm Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 flex-1">
              <InsightTile icon={BirdIcon} value={totalBirds.toLocaleString()} label="Total Birds" />
              <InsightTile icon={BatchIcon} value={activeBatches.length} label="Active Batches" />
              <InsightTile icon={PenIcon} value={pensCount || '—'} label="Pens" />
              <InsightTile icon={EggIcon} value={`~${eggsPerDay}`} label="Egg Production" hint="pcs/day, 7d" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default DashboardPage;
