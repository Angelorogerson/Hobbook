/**
 * Geocoding via OpenStreetMap Nominatim, proxied by our backend.
 *
 * Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 * max. 1 request/second, identifying User-Agent, caching, no bulk/autocomplete use.
 * We therefore serialise upstream calls (>= 1.1 s apart) and cache results for 24 h.
 * The provider can be swapped by setting GEOCODER_URL to a compatible instance.
 */

const BASE_URL = () => (process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const USER_AGENT = 'Hobbook/1.0 (community sports events)';
const MIN_INTERVAL_MS = 1100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const TIMEOUT_MS = 8000;

const cache = new Map(); // key -> { at, value }
let queue = Promise.resolve();
let lastCall = 0;

export class GeocoderUnavailableError extends Error {}

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  // Refresh LRU position
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}

function cacheSet(key, value) {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

/** Run fn after the previous upstream call, keeping >= MIN_INTERVAL_MS between calls. */
function throttled(fn) {
  const run = queue.then(async () => {
    const wait = lastCall + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return fn();
  });
  queue = run.catch(() => {});
  return run;
}

async function fetchJson(path, params) {
  const url = `${BASE_URL()}${path}?${new URLSearchParams(params)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'de,en' },
      signal: controller.signal,
    });
    if (!res.ok) throw new GeocoderUnavailableError(`Geocoder responded ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err instanceof GeocoderUnavailableError) throw err;
    throw new GeocoderUnavailableError(err.message);
  } finally {
    clearTimeout(timer);
  }
}

/** Map a Nominatim result to our location shape. */
export function toLocation(r) {
  if (!r) return null;
  const a = r.address || {};
  const street = [a.road || a.pedestrian || a.footway || a.path, a.house_number].filter(Boolean).join(' ');
  const city = a.city || a.town || a.village || a.municipality || a.suburb || a.county || '';
  const postcodeCity = [a.postcode, city].filter(Boolean).join(' ');
  const address = [street, postcodeCity].filter(Boolean).join(', ') || r.display_name || '';
  const placeName =
    r.name || a.leisure || a.amenity || a.park || street || (r.display_name || '').split(',')[0] || '';
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    placeName,
    address,
    city,
    countryCode: a.country_code ? a.country_code.toUpperCase() : undefined,
    lat,
    lng,
    displayName: r.display_name || address,
  };
}

export async function search(q) {
  const key = `s:${q.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const data = await throttled(() =>
    fetchJson('/search', { q, format: 'jsonv2', addressdetails: '1', limit: '5' })
  );
  const results = (Array.isArray(data) ? data : []).map(toLocation).filter(Boolean);
  cacheSet(key, results);
  return results;
}

export async function reverse(lat, lng) {
  const key = `r:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;
  const data = await throttled(() =>
    fetchJson('/reverse', { lat: String(lat), lon: String(lng), format: 'jsonv2', addressdetails: '1', zoom: '18' })
  );
  const result = data && !data.error ? toLocation(data) : null;
  // Keep the exact pin the user chose; Nominatim returns the nearest object's position.
  const value = result ? { ...result, lat, lng } : null;
  cacheSet(key, value);
  return value;
}

/** Test helper */
export function _resetGeocoder() {
  cache.clear();
  queue = Promise.resolve();
  lastCall = 0;
}
