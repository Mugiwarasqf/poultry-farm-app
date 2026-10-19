import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, RefreshCw } from 'lucide-react';
import { describeWeather, loadWeatherForFarm, readDeviceCoords, saveDeviceCoords } from '../../lib/weather';
import { Skeleton } from './Skeleton';

const deg = (n) => (n == null || Number.isNaN(Number(n)) ? '–' : `${Math.round(n)}°`);

function DayTile({ title, day, tone }) {
  const { emoji, label } = describeWeather(day.code);
  return (
    <div
      className={`rounded-2xl border p-3.5 flex flex-col transition-colors ${
        tone === 'lime'
          ? 'bg-[#F7FFE0] border-[#E3F5A8] dark:bg-[#142312] dark:border-[#274220]'
          : 'bg-[#F2F7FF] border-[#DCE7F7] dark:bg-[#0F1D30] dark:border-[#1E395F]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#142033] dark:text-[#F5F7F5]">{title}</span>
        <span className="text-[28px] leading-none" role="img" aria-label={label}>{emoji}</span>
      </div>
      <div className="text-xs text-[#70829B] dark:text-[#94A3B8] mt-1 truncate">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-lg font-semibold text-[#142033] dark:text-[#F5F7F5] tabular-nums">{deg(day.max)}</span>
        <span className="text-sm text-[#70829B] dark:text-[#94A3B8] tabular-nums">{deg(day.min)}</span>
      </div>
      {day.rainChance != null && (
        <div className="text-[11px] text-[#70829B] dark:text-[#94A3B8] mt-1">
          <span role="img" aria-label="Chance of rain">💧</span> {day.rainChance}% chance of rain
        </div>
      )}
    </div>
  );
}

/**
 * Today's and tomorrow's weather for the farm, from its location in Farm
 * Details. Falls back to asking for the device's location only when the
 * farm has none, or it can't be found.
 *
 * `onUpdate(result)` is told about every new result, so the header's weather
 * badge stays in step when the farmer refreshes or shares their location here.
 */
export function WeatherCard({ location, onUpdate }) {
  const farmPlace = (location || '').trim();
  const [deviceCoords, setDeviceCoords] = useState(() => readDeviceCoords());
  const [state, setState] = useState({ status: 'loading' });
  const [locating, setLocating] = useState(false);

  const load = useCallback(
    async (force = false) => {
      setState((s) => (s.status === 'ok' && force ? { ...s, refreshing: true } : { status: 'loading' }));
      let result;
      try {
        result = await loadWeatherForFarm(farmPlace, { force });
      } catch {
        result = { status: 'error' };
      }
      setState(result);
      onUpdate?.(result);
    },
    // deviceCoords is read inside loadWeatherForFarm; it's listed so sharing a
    // location reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [farmPlace, deviceCoords]
  );

  useEffect(() => {
    load();
  }, [load]);

  const shareMyLocation = () => {
    if (!navigator.geolocation) {
      setState({ status: 'error', message: 'This device can’t share its location.' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        saveDeviceCoords(coords);
        setDeviceCoords(coords);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setState({ status: 'error', message: 'Location access was not allowed.' });
      },
      { timeout: 15000, maximumAge: 60 * 60 * 1000 }
    );
  };

  const ok = state.status === 'ok';
  const now = ok ? describeWeather(state.forecast.current.code, state.forecast.current.isDay) : null;
  const night = ok && !state.forecast.current.isDay;
  const placeLine = ok ? [state.place.name, state.place.region].filter(Boolean).join(', ') : farmPlace;

  return (
    <section className="bg-white dark:bg-[#17191A] rounded-2xl border border-[#E1E8EF] dark:border-[#2B3238] shadow-[0_1px_2px_rgba(20,32,51,0.04)] p-4 sm:p-5 flex flex-col transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-[#F2F7FF] dark:bg-[#1E2124] flex items-center justify-center shrink-0 text-lg" aria-hidden="true">
            {now ? now.emoji : '🌤️'}
          </span>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-[#142033] dark:text-[#F5F7F5] font-heading leading-tight">Weather</h2>
            {placeLine && (
              <div className="flex items-center gap-1 text-xs text-[#70829B] dark:text-[#94A3B8] truncate">
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{placeLine}</span>
              </div>
            )}
          </div>
        </div>
        {ok && (
          <button
            type="button"
            onClick={() => load(true)}
            disabled={state.refreshing}
            className="p-2 rounded-lg text-[#70829B] dark:text-[#94A3B8] hover:text-[#142033] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#1E2124] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Refresh weather"
          >
            <RefreshCw size={15} className={state.refreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {state.status === 'loading' && (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      )}

      {(state.status === 'no-location' || state.status === 'not-found') && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-2">
          <span className="text-5xl leading-none mb-3" aria-hidden="true">🌍</span>
          <p className="text-sm font-semibold text-[#142033] dark:text-[#F5F7F5]">
            {state.status === 'no-location' ? 'Where is your farm?' : `We couldn’t find “${farmPlace}”`}
          </p>
          <p className="text-xs text-[#70829B] dark:text-[#94A3B8] mt-1 max-w-[260px]">
            Add your farm’s town to see today’s and tomorrow’s weather.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Link
              to="/settings/farm"
              className="px-4 py-2 rounded-xl bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] text-xs font-semibold transition-colors"
            >
              Add farm location
            </Link>
            <button
              type="button"
              onClick={shareMyLocation}
              disabled={locating}
              className="px-4 py-2 rounded-xl border border-[#E1E8EF] dark:border-[#2B3238] text-[#142033] dark:text-[#F5F7F5] text-xs font-semibold hover:bg-stone-50 dark:hover:bg-[#1E2124] transition-colors cursor-pointer disabled:opacity-60"
            >
              {locating ? 'Finding you…' : 'Use my location'}
            </button>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <span className="text-5xl leading-none mb-3" aria-hidden="true">🌥️</span>
          <p className="text-sm font-semibold text-[#142033] dark:text-[#F5F7F5]">Weather unavailable</p>
          <p className="text-xs text-[#70829B] dark:text-[#94A3B8] mt-1">{state.message || 'Check your connection and try again.'}</p>
          <button
            type="button"
            onClick={() => load(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw size={13} /> Try again
          </button>
        </div>
      )}

      {ok && (
        <>
          {/* Right now */}
          <div
            className={`rounded-2xl p-4 flex items-center gap-4 ${
              night
                ? 'bg-gradient-to-br from-[#1E2433] to-[#2E3A57] text-white'
                : 'bg-gradient-to-br from-[#F2F7FF] to-[#F7FFE0] dark:from-[#1E2433] dark:to-[#17261B] text-[#142033] dark:text-white'
            }`}
          >
            <span className="text-[56px] leading-none drop-shadow-[0_3px_6px_rgba(20,32,51,0.2)]" role="img" aria-label={now.label}>
              {now.emoji}
            </span>
            <div className="min-w-0">
              <div className={`text-[11px] font-medium uppercase tracking-[0.08em] ${night ? 'text-white/60' : 'text-[#70829B] dark:text-[#94A3B8]'}`}>
                Right now
              </div>
              <div className="text-4xl font-semibold font-heading leading-none mt-1 tabular-nums">
                {deg(state.forecast.current.temperature)}
                <span className={`text-lg font-medium ml-0.5 ${night ? 'text-white/60' : 'text-[#70829B] dark:text-[#94A3B8]'}`}>C</span>
              </div>
              <div className={`text-sm mt-1 truncate ${night ? 'text-white/80' : 'text-[#142033]/80 dark:text-white/85'}`}>{now.label}</div>
            </div>
          </div>

          {/* Today and tomorrow */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <DayTile title="Today" day={state.forecast.today} tone="lime" />
            <DayTile title="Tomorrow" day={state.forecast.tomorrow} tone="blue" />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[10.5px] text-[#70829B] dark:text-[#94A3B8]">
            <span>
              {state.stale ? 'Last updated ' : 'Updated '}
              {new Date(state.fetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {state.stale && ' (offline)'}
            </span>
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="hover:text-[#142033] dark:hover:text-[#F5F7F5] hover:underline">
              Weather by Open-Meteo
            </a>
          </div>
        </>
      )}
    </section>
  );
}

export default WeatherCard;
