/**
 * Test/demo seed data (in-memory DB for E2E and demos — never run against production).
 * Test accounts (throwaway values):
 *   organizer@hobbook.test / test-password-1
 *   player@hobbook.test    / test-password-2
 *   admin@hobbook.test     / test-password-3
 */
import { User, ConnectEvent } from '../models/index.js';
import { cityKey } from '../utils/text.js';

export const TEST_USERS = {
  organizer: { name: 'Olga Organisatorin', email: 'organizer@hobbook.test', password: 'test-password-1' },
  player: { name: 'Paul Spieler', email: 'player@hobbook.test', password: 'test-password-2' },
  admin: { name: 'Ada Admin', email: 'admin@hobbook.test', password: 'test-password-3', role: 'admin' },
};

const inDays = (d, hour = 18) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  t.setHours(hour, 0, 0, 0);
  return t;
};

const loc = (placeName, address, city, lat, lng, countryCode = 'DE') => ({
  placeName,
  address,
  city,
  cityKey: cityKey(city),
  countryCode,
  point: { type: 'Point', coordinates: [lng, lat] },
});

export async function seed() {
  await Promise.all([User.deleteMany({}), ConnectEvent.deleteMany({})]);
  const [organizer, player] = await Promise.all([
    User.create(TEST_USERS.organizer),
    User.create(TEST_USERS.player),
    User.create(TEST_USERS.admin),
  ]);

  const base = { creator: organizer._id, participants: [organizer._id], timezone: 'Europe/Berlin', visibility: 'public' };
  await ConnectEvent.create([
    {
      ...base,
      title: 'Feierabend-Kick im Park',
      sport: 'football',
      description: 'Lockeres 5 gegen 5, alle Niveaus willkommen.',
      location: loc('Bolzplatz Volkspark', 'Volkspark 1, 10115 Berlin', 'Berlin', 52.5321, 13.3849),
      startAt: inDays(1),
      endAt: inDays(1, 20),
      maxParticipants: 10,
      level: 'all',
    },
    {
      ...base,
      title: 'Streetball 3 gegen 3',
      sport: 'basketball',
      description: 'Bring gute Laune mit.',
      location: loc('Streetball-Court Mauerpark', 'Bernauer Str. 63, 13355 Berlin', 'Berlin', 52.5403, 13.4025),
      startAt: inDays(2),
      endAt: inDays(2, 20),
      maxParticipants: 6,
      level: 'intermediate',
    },
    {
      ...base,
      title: 'Lauftreff am Main',
      sport: 'running',
      description: '8 km gemütliches Tempo.',
      location: loc('Eiserner Steg', 'Mainkai, 60311 Frankfurt am Main', 'Frankfurt am Main', 50.1068, 8.6834),
      startAt: inDays(3, 9),
      endAt: inDays(3, 10),
      maxParticipants: 20,
      level: 'beginner',
    },
    {
      ...base,
      title: 'Volleyball am Isarstrand',
      sport: 'volleyball',
      location: loc('Beachfeld Isar', 'Erhardtstraße 1, 80469 München', 'München', 48.1307, 11.5813),
      startAt: inDays(4),
      endAt: inDays(4, 20),
      maxParticipants: 2,
      participants: [organizer._id, player._id],
      status: 'full',
    },
  ]);
}
