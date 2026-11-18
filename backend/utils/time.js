// Time-zone helpers without a date library: weekly games are stored as local
// weekday + "HH:mm" in an IANA zone and converted to UTC per occurrence.

const formatters = new Map();
function partsOf(date, timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  const out = {};
  for (const p of f.formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** Offset of `timeZone` from UTC at `date`, in ms (Berlin in summer: +7 200 000). */
export function tzOffsetMs(date, timeZone) {
  const p = partsOf(date, timeZone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Local wall time ("2026-03-29", "19:00") in `timeZone` → the UTC instant. */
export function zonedTimeToUtc(dateKey, time, timeZone) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let ts = wall - tzOffsetMs(new Date(wall), timeZone);
  ts = wall - tzOffsetMs(new Date(ts), timeZone); // second pass settles DST edges
  return new Date(ts);
}

/** Local calendar date (yyyy-mm-dd) of an instant in `timeZone`. */
export function localDateKey(date, timeZone) {
  const p = partsOf(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a yyyy-mm-dd date. */
export function isoWeekday(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const WEEKDAYS = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const WEEKDAYS_SHORT = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** "Do., 27.11., 19:00 Uhr" in the game's time zone (for notices and emails). */
export function formatWhen(date, timeZone = 'Europe/Berlin') {
  const d = new Date(date);
  const day = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone }).format(d);
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone }).format(d);
  return `${day}, ${time} Uhr`;
}

/** "19:00" in the game's time zone. */
export function formatClock(date, timeZone = 'Europe/Berlin') {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(date));
}
