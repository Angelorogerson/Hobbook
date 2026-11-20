// iCalendar (RFC 5545) serializer for the personal calendar feed.
// Pure functions: no database, no environment access.

const CRLF = '\r\n';
const MAX_OCTETS = 75;

/** Escape a TEXT value: backslash, semicolon, comma and line breaks (RFC 5545 §3.3.11). */
export function escapeText(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    // Other control characters are not allowed in TEXT.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold one content line so no physical line is longer than 75 octets (§3.1).
 * Continuation lines start with one space. Multi-byte characters are never split.
 */
export function foldLine(line) {
  if (Buffer.byteLength(line, 'utf8') <= MAX_OCTETS) return line;
  const parts = [];
  let current = '';
  let size = 0;
  // The leading space of a continuation line counts towards its 75 octets.
  let limit = MAX_OCTETS;
  for (const ch of line) {
    const bytes = Buffer.byteLength(ch, 'utf8');
    if (size + bytes > limit) {
      parts.push(current);
      current = '';
      size = 0;
      limit = MAX_OCTETS - 1;
    }
    current += ch;
    size += bytes;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/** UTC date-time in basic format: 20260131T183000Z. */
export function formatUtc(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date for calendar');
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// A URI value is not escaped like TEXT; line breaks and control characters must not appear.
// eslint-disable-next-line no-control-regex
const cleanUri = (value) => String(value).replace(/[\u0000- \u007F]/g, '');

const coordinate = (n) => String(Math.round(Number(n) * 1e6) / 1e6);

/**
 * @typedef {object} CalendarEntry
 * @property {string} uid
 * @property {Date|string} start
 * @property {Date|string} end
 * @property {string} summary
 * @property {string} [location]
 * @property {string} [description]
 * @property {string} [url]
 * @property {{ lat: number, lng: number }} [geo]
 * @property {'CONFIRMED'|'TENTATIVE'|'CANCELLED'} [status]
 * @property {Date|string} [lastModified]
 * @property {number} [sequence]
 */

/** Content lines (unfolded) of one VEVENT. */
export function eventLines(entry, now = new Date()) {
  const modified = entry.lastModified || now;
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeText(entry.uid)}`,
    `DTSTAMP:${formatUtc(modified)}`,
    `DTSTART:${formatUtc(entry.start)}`,
    `DTEND:${formatUtc(entry.end)}`,
    `SUMMARY:${escapeText(entry.summary)}`,
  ];
  if (entry.location) lines.push(`LOCATION:${escapeText(entry.location)}`);
  if (entry.geo && Number.isFinite(entry.geo.lat) && Number.isFinite(entry.geo.lng)) {
    lines.push(`GEO:${coordinate(entry.geo.lat)};${coordinate(entry.geo.lng)}`);
  }
  if (entry.description) lines.push(`DESCRIPTION:${escapeText(entry.description)}`);
  if (entry.url) lines.push(`URL:${cleanUri(entry.url)}`);
  lines.push(`STATUS:${entry.status || 'CONFIRMED'}`);
  lines.push(`LAST-MODIFIED:${formatUtc(modified)}`);
  lines.push(`SEQUENCE:${Math.max(0, Math.trunc(Number(entry.sequence) || 0))}`);
  lines.push('END:VEVENT');
  return lines;
}

/**
 * A complete calendar as one string with CRLF line ends and folded lines.
 * @param {{ name?: string, entries: CalendarEntry[], now?: Date }} input
 */
export function buildCalendar({ name = 'Hobbook', entries = [], now = new Date() }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hobbook//Kalender-Abo//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    // Hint for calendar apps: look again every hour.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  for (const entry of entries) lines.push(...eventLines(entry, now));
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}
