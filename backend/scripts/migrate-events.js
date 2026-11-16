/**
 * Migrate legacy ConnectEvent documents to the new Event + Location contract.
 *
 *   node scripts/migrate-events.js            # dry run (default): prints what would change
 *   node scripts/migrate-events.js --apply    # writes changes
 *
 * Legacy shape: date (Date), startTime/endTime ("HH:mm"), skillLevel, isPublic,
 * location { name, address, city, coordinates: { type, coordinates } }.
 * Coordinates are only kept when they are a real, non-[0,0] point — locations
 * are never fabricated; events without coordinates are listed but not mapped.
 * Times are interpreted in Europe/Berlin (the only market the legacy data had).
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { cityKey } from '../utils/text.js';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const TZ = 'Europe/Berlin';

/** Convert a local wall-clock time in TZ to a UTC Date. */
export function zonedToUtc(dateOnly, hhmm, timeZone = TZ) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  const d = new Date(dateOnly);
  const guess = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h || 0, m || 0);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const asLocal = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (asLocal - guess));
}

export function migrateDoc(doc) {
  const set = {};
  const unset = {};

  if (!doc.startAt && doc.date) {
    set.startAt = zonedToUtc(doc.date, doc.startTime);
    let end = zonedToUtc(doc.date, doc.endTime || doc.startTime);
    if (end <= set.startAt) end = new Date(set.startAt.getTime() + 2 * 60 * 60 * 1000);
    set.endAt = end;
    set.timezone = TZ;
  }

  const loc = doc.location || {};
  if (!loc.cityKey) {
    const coords = loc.coordinates?.coordinates;
    const hasPoint =
      Array.isArray(coords) && coords.length === 2 && coords.every(Number.isFinite) && !(coords[0] === 0 && coords[1] === 0);
    set.location = {
      placeName: loc.placeName || loc.name || loc.address || 'Unbekannter Ort',
      address: loc.address || loc.name || '',
      city: loc.city || '',
      cityKey: cityKey(loc.city || ''),
      ...(hasPoint && { point: { type: 'Point', coordinates: coords } }),
    };
  }

  if (!doc.level) set.level = doc.skillLevel || 'all';
  if (!doc.visibility) set.visibility = doc.isPublic === false ? 'unlisted' : 'public';
  if (doc.maxParticipants !== undefined && doc.maxParticipants < 2) set.maxParticipants = 2;

  for (const k of ['date', 'startTime', 'endTime', 'skillLevel', 'isPublic']) {
    if (doc[k] !== undefined) unset[k] = '';
  }
  return { set, unset };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.collection('connectevents');
  const docs = await col.find({}).toArray();
  let changed = 0;

  for (const doc of docs) {
    const { set, unset } = migrateDoc(doc);
    if (!Object.keys(set).length && !Object.keys(unset).length) continue;
    changed++;
    console.log(`${APPLY ? 'UPDATE' : 'WOULD UPDATE'} ${doc._id}: set ${Object.keys(set).join(', ') || '-'}; unset ${Object.keys(unset).join(', ') || '-'}`);
    if (APPLY) {
      const update = {};
      if (Object.keys(set).length) update.$set = set;
      if (Object.keys(unset).length) update.$unset = unset;
      await col.updateOne({ _id: doc._id }, update);
    }
  }

  if (APPLY) {
    // Old index on location.coordinates (if any) is harmless; ensure new indexes exist.
    const { default: ConnectEvent } = await import('../models/ConnectEvent.js');
    await ConnectEvent.syncIndexes();
  }

  console.log(`${docs.length} events checked, ${changed} ${APPLY ? 'updated' : 'would be updated'}.`);
  await mongoose.disconnect();
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
