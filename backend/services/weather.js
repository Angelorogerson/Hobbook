// Weather for upcoming games from Open-Meteo (free, no key). Forecasts are
// cached on the event and refreshed at most every 3 hours.

const SEVERE_CODES = new Set([65, 67, 75, 82, 86, 95, 96, 99]);

export function describeCode(code) {
  if (code === 0) return 'Klar';
  if (code <= 2) return 'Teils bewölkt';
  if (code === 3) return 'Bewölkt';
  if (code === 45 || code === 48) return 'Nebel';
  if (code >= 51 && code <= 57) return 'Nieselregen';
  if (code >= 61 && code <= 67) return code >= 65 ? 'Starker Regen' : 'Regen';
  if (code >= 71 && code <= 77) return 'Schnee';
  if (code >= 80 && code <= 82) return code === 82 ? 'Heftige Schauer' : 'Schauer';
  if (code === 85 || code === 86) return 'Schneeschauer';
  if (code >= 95) return 'Gewitter';
  return 'Wetter unklar';
}

/** Reduce hourly values for the game's hours to one summary. */
export function summarize(hours) {
  if (!hours.length) return null;
  const worst = hours.reduce((a, h) => (SEVERE_CODES.has(h.code) || h.code > a.code ? h : a), hours[0]);
  const precipMm = Math.max(...hours.map((h) => h.precip ?? 0));
  const windKmh = Math.max(...hours.map((h) => h.wind ?? 0));
  const tempC = Math.round(hours[0].temp);
  const severe = SEVERE_CODES.has(worst.code) || precipMm >= 4 || windKmh >= 50;
  return {
    code: worst.code,
    tempC,
    precipMm: Math.round(precipMm * 10) / 10,
    windKmh: Math.round(windKmh),
    severe,
    summary: `${describeCode(worst.code)}, ${tempC} °C${precipMm >= 0.5 ? `, ${String(Math.round(precipMm * 10) / 10).replace('.', ',')} mm/h` : ''}${windKmh >= 40 ? `, Wind ${Math.round(windKmh)} km/h` : ''}`,
  };
}

async function openMeteo(lat, lng, startAt, endAt) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
    '&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m&forecast_days=3&timezone=GMT';
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data = await res.json();
  const h = data?.hourly;
  if (!h?.time) return null;
  const from = new Date(startAt).getTime() - 3600 * 1000 + 1;
  const to = new Date(endAt).getTime();
  const hours = [];
  h.time.forEach((t, i) => {
    const ts = Date.parse(`${t}:00Z`);
    if (ts >= from && ts <= to) {
      hours.push({ temp: h.temperature_2m[i], precip: h.precipitation[i], code: h.weather_code[i], wind: h.wind_speed_10m[i] });
    }
  });
  return summarize(hours);
}

let fetcher = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'e2e' ? async () => null : openMeteo;

/** Tests inject a fake forecast source. */
export function setWeatherFetcher(fn) {
  fetcher = fn;
}

export async function forecastFor(event) {
  const c = event.location?.point?.coordinates;
  if (!Array.isArray(c)) return null;
  try {
    return await fetcher(c[1], c[0], event.startAt, event.endAt);
  } catch {
    return null;
  }
}
