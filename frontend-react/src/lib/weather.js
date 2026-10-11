/**
 * Farm weather from Open-Meteo (open-meteo.com): free, no API key, so there
 * is no secret to ship in the frontend.
 *
 * The farm's location is free text from Farm Details ("Ikorodu, Lagos"), so
 * it is first turned into coordinates with Open-Meteo's geocoder, limited to
 * Nigeria. Both lookups are cached on this device: coordinates for 30 days,
 * the forecast for 30 minutes. If a refresh fails, the last forecast is
 * returned marked `stale` rather than nothing.
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const COUNTRY = 'NG';

const PLACE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FORECAST_TTL_MS = 30 * 60 * 1000;
const CACHE_PREFIX = 'farmbook_weather_';

// ---- device cache (every access guarded: storage can be blocked or full) ----

function readCache(key) {
  try {
    return JSON.parse(localStorage.getItem(CACHE_PREFIX + key) || 'null');
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Not cached this time; the next visit simply fetches again.
  }
}

const norm = (s) => String(s || '').trim().toLowerCase();

// ---- weather codes ----------------------------------------------------------

/**
 * WMO weather code → emoji + plain label. Clear and partly cloudy skies get
 * night versions when `isDay` is false.
 */
export function describeWeather(code, isDay = true) {
  const c = Number(code);
  if (c === 0) return isDay ? { emoji: '☀️', label: 'Sunny' } : { emoji: '🌙', label: 'Clear night' };
  if (c === 1 || c === 2) return isDay ? { emoji: '⛅', label: 'Partly cloudy' } : { emoji: '☁️', label: 'Partly cloudy' };
  if (c === 3) return { emoji: '☁️', label: 'Cloudy' };
  if (c === 45 || c === 48) return { emoji: '🌫️', label: 'Foggy' };
  if (c >= 51 && c <= 57) return { emoji: '🌦️', label: 'Drizzle' };
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) {
    return { emoji: '🌧️', label: c === 65 || c === 82 ? 'Heavy rain' : c >= 80 ? 'Rain showers' : 'Rain' };
  }
  if (c >= 71 && c <= 77) return { emoji: '🌨️', label: 'Snow' };
  if (c >= 85 && c <= 86) return { emoji: '🌨️', label: 'Snow showers' };
  if (c >= 95) return { emoji: '⛈️', label: 'Thunderstorm' };
  return { emoji: '🌤️', label: 'Fair' };
}

// ---- lookups ------------------------------------------------------------------

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
  return res.json();
}

/**
 * Coordinates for a free-text place. Tries the whole text, then the part
 * before the first comma ("Ikorodu, Lagos" → "Ikorodu"). Null if not found.
 */
export async function geocode(text) {
  const key = `place:${norm(text)}`;
  const cached = readCache(key);
  if (cached && Date.now() - cached.at < PLACE_TTL_MS) return cached.place;

  const attempts = [text.trim(), text.split(',')[0].trim()].filter((t, i, all) => t && all.indexOf(t) === i);
  for (const name of attempts) {
    const data = await getJson(`${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=1&countryCode=${COUNTRY}&language=en`);
    const hit = data?.results?.[0];
    if (hit) {
      const place = { name: hit.name, region: hit.admin1 || '', latitude: hit.latitude, longitude: hit.longitude };
      writeCache(key, { at: Date.now(), place });
      return place;
    }
  }
  return null;
}

/** Current conditions plus today and tomorrow. */
export async function getForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '2',
  });
  const data = await getJson(`${FORECAST_URL}?${params}`);
  const d = data.daily || {};
  const day = (i) => ({
    date: d.time?.[i],
    code: d.weather_code?.[i],
    max: d.temperature_2m_max?.[i],
    min: d.temperature_2m_min?.[i],
    rainChance: d.precipitation_probability_max?.[i],
  });
  return {
    current: {
      temperature: data.current?.temperature_2m,
      code: data.current?.weather_code,
      isDay: data.current?.is_day !== 0,
    },
    today: day(0),
    tomorrow: day(1),
  };
}

// ---- the device's location (only after the farmer taps "Use my location") ---

const DEVICE_KEY = 'farmbook_weather_device';

export function readDeviceCoords() {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveDeviceCoords(coords) {
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(coords));
  } catch {
    // Only remembered for this visit.
  }
}

/**
 * Weather for the farm: its typed location first, then the device location
 * if the farmer shared one. `{ status: 'no-location' }` when there is neither.
 * Shared by the header badge and the weather popover so both agree.
 */
export async function loadWeatherForFarm(farmLocation, { force = false } = {}) {
  const place = (farmLocation || '').trim();
  const device = readDeviceCoords();
  if (!place && !device) return { status: 'no-location' };
  let result = await loadFarmWeather(place || device, { force });
  if (result.status === 'not-found' && place && device) {
    result = await loadFarmWeather(device, { force });
  }
  return result;
}

/**
 * Everything the weather card needs for a place.
 *
 * `where` is either the farm's location text or `{ latitude, longitude }`
 * from the device. Resolves to:
 *   { status: 'ok', place, forecast, fetchedAt, stale }
 *   { status: 'not-found' }
 * and throws only when nothing at all (not even a cached copy) is available.
 */
export async function loadFarmWeather(where, { force = false } = {}) {
  const place = typeof where === 'string'
    ? await geocode(where)
    : { name: 'Your location', region: '', latitude: where.latitude, longitude: where.longitude };
  if (!place) return { status: 'not-found' };

  const key = `forecast:${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`;
  const cached = readCache(key);
  if (!force && cached && Date.now() - cached.at < FORECAST_TTL_MS) {
    return { status: 'ok', place, forecast: cached.forecast, fetchedAt: cached.at, stale: false };
  }

  try {
    const forecast = await getForecast(place.latitude, place.longitude);
    const at = Date.now();
    writeCache(key, { at, forecast });
    return { status: 'ok', place, forecast, fetchedAt: at, stale: false };
  } catch (err) {
    if (cached) return { status: 'ok', place, forecast: cached.forecast, fetchedAt: cached.at, stale: true };
    throw err;
  }
}
