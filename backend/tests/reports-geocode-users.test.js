import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, makeUser, insertEvent } from './helpers.js';
import { ConnectEvent, Report, User } from '../models/index.js';
import { _resetGeocoder, toLocation } from '../services/geocoder.js';
import { migrateDoc, zonedToUtc } from '../scripts/migrate-events.js';

describe('reports', () => {
  it('signed-in users report once; admins moderate and can cancel the event', async () => {
    const org = await makeUser();
    const reporter = await makeUser();
    const admin = await makeUser({ role: 'admin' });
    const ev = await insertEvent(org.user);

    expect((await api().post('/api/reports').send({ eventId: ev._id, reason: 'spam' })).status).toBe(401);
    expect((await api().post('/api/reports').set(reporter.auth).send({ eventId: ev._id, reason: 'nope' })).status).toBe(400);

    const created = await api().post('/api/reports').set(reporter.auth).send({ eventId: ev._id, reason: 'unsafe', text: 'Bitte prüfen' });
    expect(created.status).toBe(201);
    const dup = await api().post('/api/reports').set(reporter.auth).send({ eventId: ev._id, reason: 'unsafe' });
    expect(dup.status).toBe(200);
    expect(await Report.countDocuments()).toBe(1);

    expect((await api().get('/api/reports').set(reporter.auth)).status).toBe(403);
    const list = await api().get('/api/reports?status=open').set(admin.auth);
    expect(list.body.reports).toHaveLength(1);
    expect(list.body.reports[0].event.title).toBe('Direkt');

    const id = list.body.reports[0]._id;
    expect((await api().patch(`/api/reports/${id}`).set(reporter.auth).send({ status: 'resolved' })).status).toBe(403);
    const resolved = await api().patch(`/api/reports/${id}`).set(admin.auth).send({ status: 'resolved', cancelEvent: true, note: 'ok' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.report.status).toBe('resolved');
    expect((await ConnectEvent.findById(ev._id)).status).toBe('cancelled');
  });

  it('404 for reports on unknown events', async () => {
    const r = await makeUser();
    const res = await api().post('/api/reports').set(r.auth).send({ eventId: '0123456789abcdef01234567', reason: 'spam' });
    expect(res.status).toBe(404);
  });
});

describe('geocode proxy', () => {
  beforeEach(() => _resetGeocoder());
  afterEach(() => vi.unstubAllGlobals());

  const nominatimResult = {
    lat: '52.5321',
    lon: '13.3849',
    name: 'Volkspark am Weinberg',
    display_name: 'Volkspark am Weinberg, Berlin, Deutschland',
    address: { road: 'Weinbergsweg', house_number: '1', postcode: '10119', city: 'Berlin', country_code: 'de' },
  };

  it('maps results, sends a generic User-Agent and caches', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [nominatimResult] }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await api().get('/api/geocode/search?q=Volkspark Berlin');
    expect(res.status).toBe(200);
    expect(res.body.results[0]).toMatchObject({
      placeName: 'Volkspark am Weinberg',
      address: 'Weinbergsweg 1, 10119 Berlin',
      city: 'Berlin',
      countryCode: 'DE',
      lat: 52.5321,
      lng: 13.3849,
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['User-Agent']).toMatch(/^Hobbook\//);
    expect(init.headers['User-Agent']).not.toMatch(/@/);

    await api().get('/api/geocode/search?q=volkspark berlin').expect(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reverse keeps the exact pin coordinates', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => nominatimResult })));
    const res = await api().get('/api/geocode/reverse?lat=52.5&lng=13.4');
    expect(res.body.result).toMatchObject({ lat: 52.5, lng: 13.4, city: 'Berlin' });
  });

  it('returns 503 with a manual fallback hint when upstream fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })));
    const res = await api().get('/api/geocode/search?q=irgendwo');
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/Pin/);
  });

  it('validates input', async () => {
    expect((await api().get('/api/geocode/search?q=ab')).status).toBe(400);
    expect((await api().get('/api/geocode/reverse?lat=100&lng=0')).status).toBe(400);
  });

  it('toLocation ignores results without coordinates', () => {
    expect(toLocation({ display_name: 'x' })).toBeNull();
  });
});

describe('account deletion', () => {
  it('requires the password, cancels own joined events and removes the user', async () => {
    const org = await makeUser({ password: 'secret-pass' });
    const p = await makeUser();
    const withOthers = await insertEvent(org.user, { participants: [org.user._id, p.user._id] });
    const alone = await insertEvent(org.user);
    const foreign = await insertEvent(p.user, { maxParticipants: 2, participants: [p.user._id, org.user._id], status: 'full' });

    expect((await api().delete('/api/users/me').set(org.auth).send({ password: 'wrong' })).status).toBe(400);
    expect((await api().delete('/api/users/me').set(org.auth).send({ password: 'secret-pass' })).status).toBe(200);

    expect(await User.findById(org.user._id)).toBeNull();
    expect((await ConnectEvent.findById(withOthers._id)).status).toBe('cancelled');
    expect(await ConnectEvent.findById(alone._id)).toBeNull();
    const f = await ConnectEvent.findById(foreign._id);
    expect(f.participants.map(String)).toEqual([p.user._id.toString()]);
    expect(f.status).toBe('open');
  });
});

describe('profile', () => {
  it('only accepts known sports and whitelisted fields', async () => {
    const u = await makeUser();
    expect((await api().put('/api/users/me').set(u.auth).send({ sports: ['quidditch'] })).status).toBe(400);
    const ok = await api().put('/api/users/me').set(u.auth).send({ sports: ['running'], role: 'admin', city: 'Köln' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.role).toBe('user');
    expect(ok.body.user.sports).toEqual(['running']);
  });

  it('password change uses PUT /users/me/password', async () => {
    const u = await makeUser({ password: 'old-password' });
    const res = await api().put('/api/users/me/password').set(u.auth).send({ currentPassword: 'old-password', newPassword: 'new-password-1' });
    expect(res.status).toBe(200);
  });
});

describe('legacy migration', () => {
  it('converts Berlin wall-clock times to UTC across DST', () => {
    expect(zonedToUtc(new Date('2026-07-01T00:00:00Z'), '18:00').toISOString()).toBe('2026-07-01T16:00:00.000Z');
    expect(zonedToUtc(new Date('2026-12-01T00:00:00Z'), '18:00').toISOString()).toBe('2026-12-01T17:00:00.000Z');
  });

  it('never fabricates coordinates', () => {
    const { set, unset } = migrateDoc({
      date: new Date('2026-07-01T00:00:00Z'),
      startTime: '18:00',
      endTime: '20:00',
      skillLevel: 'beginner',
      isPublic: true,
      location: { name: 'Hell’s place', city: 'Berlin', coordinates: { type: 'Point', coordinates: [0, 0] } },
    });
    expect(set.location.point).toBeUndefined();
    expect(set.location.placeName).toBe('Hell’s place');
    expect(set.level).toBe('beginner');
    expect(set.visibility).toBe('public');
    expect(Object.keys(unset).sort()).toEqual(['date', 'endTime', 'isPublic', 'skillLevel', 'startTime']);
  });
});

describe('app basics', () => {
  it('unknown routes and legacy APIs return 404', async () => {
    expect((await api().get('/api/venues')).status).toBe(404);
    expect((await api().get('/api/bookings/my')).status).toBe(404);
    expect((await api().get('/api/favorites')).status).toBe(404);
  });

  it('GET /health reports the database state', async () => {
    const res = await api().get('/health');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('up');
  });

  it('serves the sports list', async () => {
    const res = await api().get('/api/sports');
    expect(res.body.sports.length).toBeGreaterThan(2);
  });
});
