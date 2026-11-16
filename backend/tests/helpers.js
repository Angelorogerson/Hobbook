import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { User, ConnectEvent } from '../models/index.js';
import { cityKey } from '../utils/text.js';

export const app = createApp();
export const api = () => request(app);

let n = 0;
export async function makeUser(overrides = {}) {
  n += 1;
  const user = await User.create({
    name: overrides.name || `Test Person${n}`,
    email: overrides.email || `user${n}-${Date.now()}@hobbook.test`,
    password: overrides.password || 'test-password',
    role: overrides.role || 'user',
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

export const hoursFromNow = (h) => new Date(Date.now() + h * 3600 * 1000);

export function eventPayload(overrides = {}) {
  return {
    title: 'Kick im Park',
    sport: 'football',
    description: 'Locker',
    startAt: hoursFromNow(24).toISOString(),
    endAt: hoursFromNow(26).toISOString(),
    timezone: 'Europe/Berlin',
    maxParticipants: 10,
    level: 'all',
    visibility: 'public',
    location: { placeName: 'Volkspark', address: 'Volkspark 1, 10115 Berlin', city: 'Berlin', countryCode: 'DE', lat: 52.53, lng: 13.38 },
    ...overrides,
  };
}

/** Insert directly (bypasses API validation, e.g. for past events). */
export async function insertEvent(creator, overrides = {}) {
  const { location, ...rest } = overrides;
  const loc = location || { placeName: 'Volkspark', address: 'Volkspark 1', city: 'Berlin', lat: 52.53, lng: 13.38 };
  return ConnectEvent.create({
    title: 'Direkt',
    sport: 'football',
    startAt: hoursFromNow(24),
    endAt: hoursFromNow(26),
    maxParticipants: 10,
    creator: creator._id,
    participants: [creator._id],
    location: {
      placeName: loc.placeName,
      address: loc.address,
      city: loc.city,
      cityKey: cityKey(loc.city),
      ...(loc.lat !== undefined && { point: { type: 'Point', coordinates: [loc.lng, loc.lat] } }),
    },
    ...rest,
  });
}

/** Many users at once (one shared bcrypt hash; insertMany skips the hashing hook). */
export async function makeUsersFast(count) {
  const hash = await bcrypt.hash('test-password', 4);
  const stamp = Date.now();
  const docs = await User.insertMany(
    Array.from({ length: count }, (_, i) => ({ name: `Bulk Person${i}`, email: `bulk${i}-${stamp}@hobbook.test`, password: hash }))
  );
  return docs.map((user) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return { user, token, auth: { Authorization: `Bearer ${token}` } };
  });
}
