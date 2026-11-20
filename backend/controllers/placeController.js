import { ConnectEvent, Group } from '../models/index.js';

const MAX_PLACES = 5;
// How far back we look. Enough to find five different places even when the
// same weekly game fills most of the history.
const SCAN_EVENTS = 100;
const SCAN_GROUPS = 30;

/** Same place = same name and the same spot to about 10 m (4 decimals). */
const placeKey = (p) => `${p.placeName.trim().toLowerCase()}|${p.lat.toFixed(4)}|${p.lng.toFixed(4)}`;

function toPlace(location) {
  const coords = location?.point?.coordinates;
  if (!location?.placeName || !Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    placeName: location.placeName,
    address: location.address || '',
    city: location.city || '',
    ...(location.countryCode && { countryCode: location.countryCode }),
    lat,
    lng,
  };
}

/**
 * GET /api/places/mine: the places the signed-in person used last for their
 * own events and Stammspiele, newest first, without duplicates.
 */
export const myPlaces = async (req, res) => {
  const uid = req.user._id;
  const withPoint = { 'location.point': { $exists: true } };
  const [events, groups] = await Promise.all([
    ConnectEvent.find({ creator: uid, ...withPoint }).sort({ createdAt: -1 }).limit(SCAN_EVENTS).select('location createdAt').lean(),
    Group.find({ organizer: uid, ...withPoint }).sort({ createdAt: -1 }).limit(SCAN_GROUPS).select('location createdAt').lean(),
  ]);

  const used = [...events, ...groups].sort((a, b) => b.createdAt - a.createdAt);
  const seen = new Set();
  const places = [];
  for (const doc of used) {
    const place = toPlace(doc.location);
    if (!place) continue;
    const key = placeKey(place);
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
    if (places.length === MAX_PLACES) break;
  }
  res.json({ places });
};
