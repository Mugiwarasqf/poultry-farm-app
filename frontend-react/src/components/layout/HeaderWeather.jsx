import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { describeWeather, loadWeatherForFarm } from '../../lib/weather';
import { WeatherCard } from '../ui/WeatherCard';

const deg = (n) => (n == null || Number.isNaN(Number(n)) ? '–' : `${Math.round(n)}°`);

/**
 * Weather at the top of every page: the farm's current conditions, and
 * tomorrow on wider screens. Clicking opens the full forecast (WeatherCard)
 * in a popover. Uses the same 30-minute cache as the card, so opening it
 * doesn't fetch again.
 */
export function HeaderWeather() {
  const { farm } = useAuth();
  const location = farm?.location || '';
  const [weather, setWeather] = useState({ status: 'loading' });
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadWeatherForFarm(location)
      .catch(() => ({ status: 'error' }))
      .then((result) => {
        if (!cancelled) setWeather(result);
      });
    return () => {
      cancelled = true;
    };
  }, [location]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (weather.status === 'loading') {
    return (
      <div className="flex items-center gap-2.5" aria-label="Loading weather">
        <span className="w-9 h-9 rounded-full bg-stone-100 animate-pulse" />
        <span className="hidden sm:block w-28 h-3.5 rounded bg-stone-100 animate-pulse" />
      </div>
    );
  }

  // No location yet, or it couldn't be found: point to where it's set.
  if (weather.status === 'no-location' || weather.status === 'not-found') {
    return (
      <Link
        to="/settings/farm"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold text-[#142033] hover:bg-stone-50 transition-colors"
      >
        <span className="text-xl leading-none" aria-hidden="true">📍</span>
        <span className="hidden sm:inline">Add farm location for weather</span>
        <span className="sm:hidden">Weather</span>
      </Link>
    );
  }

  // Weather is a nice-to-have; never show an error in the header.
  if (weather.status !== 'ok') return null;

  const { current, tomorrow } = weather.forecast;
  const now = describeWeather(current.code, current.isDay);
  const next = describeWeather(tomorrow.code);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="See today's and tomorrow's weather"
        className="flex items-center gap-2.5 sm:gap-3 pl-1 pr-2 py-1 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer text-left"
      >
        <span
          className="text-[30px] sm:text-[34px] leading-none drop-shadow-[0_2px_4px_rgba(20,32,51,0.18)] select-none"
          role="img"
          aria-label={now.label}
        >
          {now.emoji}
        </span>
        <span className="flex flex-col leading-tight min-w-0">
          <span className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold text-[#142033] font-heading tabular-nums">{deg(current.temperature)}C</span>
            <span className="hidden sm:inline text-sm text-[#142033]/80 truncate">
              {now.label}
              {weather.place?.name ? ` · ${weather.place.name}` : ''}
            </span>
          </span>
          <span className="hidden md:inline text-[11px] text-[#70829B] tabular-nums">
            Tomorrow {next.emoji} {deg(tomorrow.max)}/{deg(tomorrow.min)}
            {tomorrow.rainChance != null ? ` · 💧 ${tomorrow.rainChance}%` : ''}
          </span>
        </span>
        <ChevronDown size={15} className={`text-[#70829B] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Weather forecast"
          className="fixed left-3 right-3 top-[calc(4.75rem+env(safe-area-inset-top))] sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-[360px] z-50 shadow-xl rounded-2xl"
        >
          {/* Only good results flow back: a failed refresh shows inside the
              card, and must not hide the header badge (and this popover). */}
          <WeatherCard location={location} onUpdate={(result) => result.status === 'ok' && setWeather(result)} />
        </div>
      )}
    </div>
  );
}

export default HeaderWeather;
