import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, insertEvent, eventPayload } from './helpers.js';
import { ConnectEvent, Notification, User } from '../models/index.js';
import { outbox } from '../services/mailer.js';
import { alertsSettled, notifyAlertsForEvent } from '../services/alerts.js';
import { setWeatherFetcher } from '../services/weather.js';

const KL = { placeName: 'Uni-Platz', address: 'Gottlieb-Daimler-Str. 1', city: 'Kaiserslautern', countryCode: 'DE', lat: 49.4245, lng: 7.7529 };

const addAlert = (who, body) => api().post('/api/alerts').set(who.auth).send(body);
const noticesFor = (who) => Notification.find({ user: who.user._id, type: 'new_event' }).lean();

async function createEvent(who, overrides = {}) {
  const res = await api().post('/api/events').set(who.auth).send(eventPayload({ location: KL, ...overrides }));
  expect(res.status).toBe(201);
  await alertsSettled();
  return res.body.event;
}

function groupPayload(over = {}) {
  const t = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(t);
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(local) + 1;
  return {
    name: 'Basketball am Uni-Platz',
    sport: 'basketball',
    location: KL,
    weekday,
    startTime: '19:00',
    durationMin: 120,
    timezone: 'Europe/Berlin',
    maxParticipants: 8,
    minPlayers: 4,
    ...over,
  };
}

beforeEach(() => {
  outbox.length = 0;
  setWeatherFetcher(async () => null);
});

describe('search alerts: CRUD', () => {
  it('requires a session', async () => {
    expect((await api().get('/api/alerts')).status).toBe(401);
    expect((await api().post('/api/alerts').send({ city: 'Berlin' })).status).toBe(401);
    expect((await api().delete('/api/alerts/64b000000000000000000000')).status).toBe(401);
  });

  it('creates, lists and removes an alert', async () => {
    const a = await makeUser();
    const empty = await api().get('/api/alerts').set(a.auth);
    expect(empty.status).toBe(200);
    expect(empty.body.alerts).toEqual([]);

    const created = await addAlert(a, { city: '  <b>Kaiserslautern</b> ', sport: 'basketball' });
    expect(created.status).toBe(201);
    expect(created.body.alert).toMatchObject({ city: 'Kaiserslautern', sport: 'basketball' });
    expect(created.body.alert._id).toMatch(/^[a-f\d]{24}$/);
    expect(Object.keys(created.body.alert).sort()).toEqual(['_id', 'city', 'sport']);

    const stored = await User.findById(a.user._id).lean();
    expect(stored.alerts[0].cityKey).toBe('kaiserslautern');

    const all = await addAlert(a, { city: 'Köln' });
    expect(all.status).toBe(201);
    expect(all.body.alert).toMatchObject({ city: 'Köln', sport: null });

    const list = await api().get('/api/alerts').set(a.auth);
    expect(list.body.alerts.map((x) => [x.city, x.sport])).toEqual([
      ['Kaiserslautern', 'basketball'],
      ['Köln', null],
    ]);

    const removed = await api().delete(`/api/alerts/${created.body.alert._id}`).set(a.auth);
    expect(removed.status).toBe(200);
    expect(removed.body.alerts.map((x) => x.city)).toEqual(['Köln']);

    // Removing again is harmless; a malformed id is a 404.
    expect((await api().delete(`/api/alerts/${created.body.alert._id}`).set(a.auth)).status).toBe(200);
    expect((await api().delete('/api/alerts/nope').set(a.auth)).status).toBe(404);
  });

  it('validates city and sport', async () => {
    const a = await makeUser();
    const noCity = await addAlert(a, { city: '   ' });
    expect(noCity.status).toBe(400);
    expect(noCity.body.errors).toHaveProperty('city');
    expect((await addAlert(a, { city: 'x'.repeat(101) })).status).toBe(400);
    const badSport = await addAlert(a, { city: 'Berlin', sport: 'quidditch' });
    expect(badSport.status).toBe(400);
    expect(badSport.body.errors).toHaveProperty('sport');
  });

  it('returns the existing alert for the same city and sport', async () => {
    const a = await makeUser();
    const first = await addAlert(a, { city: 'Köln', sport: 'football' });
    const again = await addAlert(a, { city: 'koeln'.replace('oe', 'ö').toUpperCase(), sport: 'football' });
    expect(again.status).toBe(200);
    expect(again.body.alert._id).toBe(first.body.alert._id);

    const allSports = await addAlert(a, { city: 'Köln' });
    expect(allSports.status).toBe(201);
    const allAgain = await addAlert(a, { city: 'Köln', sport: '' });
    expect(allAgain.status).toBe(200);
    expect(allAgain.body.alert._id).toBe(allSports.body.alert._id);

    expect((await api().get('/api/alerts').set(a.auth)).body.alerts).toHaveLength(2);
  });

  it('allows at most 5 alerts, also when requests race', async () => {
    const a = await makeUser();
    const results = await Promise.all(
      ['Aachen', 'Bonn', 'Celle', 'Dortmund', 'Essen', 'Fulda', 'Gera'].map((city) => addAlert(a, { city }))
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    const rejected = results.filter((r) => r.status === 409);
    expect(rejected).toHaveLength(2);
    expect(rejected[0].body.message).toMatch(/höchstens 5 Such-Alarme/);
    expect((await User.findById(a.user._id).lean()).alerts).toHaveLength(5);

    // An alert that already exists is still returned when the list is full.
    const kept = results.find((r) => r.status === 201).body.alert;
    const same = await addAlert(a, { city: kept.city });
    expect(same.status).toBe(200);
    expect(same.body.alert._id).toBe(kept._id);
  });
});

describe('search alerts: notices for new events', () => {
  it('tells a matching person once and nobody else', async () => {
    const creator = await makeUser({ name: 'Carla Creator' });
    const fan = await makeUser();
    const anySport = await makeUser();
    const otherCity = await makeUser();
    const otherSport = await makeUser();
    const inactive = await makeUser();

    // The creator has a matching alert too, and the fan has two that match.
    await addAlert(creator, { city: 'Kaiserslautern' });
    await addAlert(fan, { city: 'Kaiserslautern', sport: 'basketball' });
    await addAlert(fan, { city: 'kaiserslautern' });
    await addAlert(anySport, { city: 'KAISERSLAUTERN' });
    await addAlert(otherCity, { city: 'Mannheim', sport: 'basketball' });
    await addAlert(otherSport, { city: 'Kaiserslautern', sport: 'football' });
    await addAlert(inactive, { city: 'Kaiserslautern' });
    await User.updateOne({ _id: inactive.user._id }, { $set: { isActive: false } });

    const event = await createEvent(creator, {
      title: 'Körbe werfen',
      sport: 'basketball',
      startAt: '2099-07-02T17:00:00.000Z',
      endAt: '2099-07-02T19:00:00.000Z',
    });

    const fanNotices = await noticesFor(fan);
    expect(fanNotices).toHaveLength(1);
    expect(fanNotices[0]).toMatchObject({
      title: 'Neu in Kaiserslautern: Körbe werfen',
      link: `/events/${event._id}`,
    });
    expect(String(fanNotices[0].event)).toBe(event._id);
    // Thursday 2 July 2099, 19:00 in Berlin (summer time)
    expect(fanNotices[0].body).toBe('Do., 02.07., 19:00 Uhr · Uni-Platz');

    expect(await noticesFor(anySport)).toHaveLength(1);
    expect(await noticesFor(creator)).toHaveLength(0);
    expect(await noticesFor(otherCity)).toHaveLength(0);
    expect(await noticesFor(otherSport)).toHaveLength(0);
    expect(await noticesFor(inactive)).toHaveLength(0);
    expect(await Notification.countDocuments({ type: 'new_event' })).toBe(2);

    const mail = outbox.find((m) => m.to === fan.user.email);
    expect(mail.subject).toBe('Neu in Kaiserslautern: Körbe werfen');
    expect(mail.text).toContain('Such-Alarm');
    expect(outbox.some((m) => m.to === creator.user.email)).toBe(false);
  });

  it('does not alert for unlisted events', async () => {
    const creator = await makeUser();
    const fan = await makeUser();
    await addAlert(fan, { city: 'Kaiserslautern' });
    await createEvent(creator, { visibility: 'unlisted' });
    expect(await Notification.countDocuments({})).toBe(0);
    expect(outbox).toHaveLength(0);
  });

  it('never throws, whatever it is given', async () => {
    await expect(notifyAlertsForEvent(null)).resolves.toBe(0);
    await expect(notifyAlertsForEvent({ visibility: 'public', location: {} })).resolves.toBe(0);
    await expect(notifyAlertsForEvent({ visibility: 'public', creator: 'not-an-id', location: { cityKey: 'x' } })).resolves.toBe(0);
  });

  it('tells people about a new public Stammspiel, but not about its weekly games', async () => {
    const org = await makeUser();
    const fan = await makeUser();
    const footballOnly = await makeUser();
    await addAlert(org, { city: 'Kaiserslautern' });
    await addAlert(fan, { city: 'Kaiserslautern', sport: 'basketball' });
    await addAlert(footballOnly, { city: 'Kaiserslautern', sport: 'football' });

    const res = await api().post('/api/groups').set(org.auth).send(groupPayload());
    expect(res.status).toBe(201);
    await alertsSettled();

    // The first weekly game exists already, yet there is exactly one notice.
    expect(await ConnectEvent.countDocuments({ group: res.body.group._id })).toBe(1);
    const notices = await noticesFor(fan);
    expect(notices).toHaveLength(1);
    expect(notices[0].title).toBe('Neues Stammspiel in Kaiserslautern: Basketball am Uni-Platz');
    expect(notices[0].link).toBe(`/s/${res.body.group.inviteCode}`);
    expect(notices[0].body).toMatch(/^Jeden \S+tag|^Jeden Mittwoch/);
    expect(notices[0].body).toContain('19:00 Uhr · Uni-Platz');
    expect(await noticesFor(org)).toHaveLength(0);
    expect(await noticesFor(footballOnly)).toHaveLength(0);
  });

  it('does not alert for an unlisted Stammspiel', async () => {
    const org = await makeUser();
    const fan = await makeUser();
    await addAlert(fan, { city: 'Kaiserslautern' });
    const res = await api().post('/api/groups').set(org.auth).send(groupPayload({ visibility: 'unlisted' }));
    expect(res.status).toBe(201);
    await alertsSettled();
    expect(await noticesFor(fan)).toHaveLength(0);
  });
});

describe('GET /api/events: text search and level', () => {
  const titles = (res) => res.body.events.map((e) => e.title).sort();

  it('matches title and place name, ignoring case', async () => {
    const { user } = await makeUser();
    await insertEvent(user, { title: 'Feierabend-Kick' });
    await insertEvent(user, { title: 'Lockere Runde', location: { placeName: 'Bolzplatz am KICKERS-Heim', address: 'Weg 1', city: 'Berlin', lat: 52.5, lng: 13.4 } });
    await insertEvent(user, { title: 'Yoga im Park' });

    const res = await api().get('/api/events').query({ q: 'kick' });
    expect(res.status).toBe(200);
    expect(titles(res)).toEqual(['Feierabend-Kick', 'Lockere Runde']);
    expect(res.body.total).toBe(2);

    expect(titles(await api().get('/api/events').query({ q: '  YOGA ' }))).toEqual(['Yoga im Park']);
    // Combined with another filter
    expect(titles(await api().get('/api/events').query({ q: 'kick', city: 'Hamburg' }))).toEqual([]);
  });

  it('treats regex characters literally', async () => {
    const { user } = await makeUser();
    await insertEvent(user, { title: 'Lauftreff (5 km)' });
    await insertEvent(user, { title: 'Lauftreff 5 km' });
    await insertEvent(user, { title: 'Abendrunde' });

    expect(titles(await api().get('/api/events').query({ q: '(5 km)' }))).toEqual(['Lauftreff (5 km)']);
    expect(titles(await api().get('/api/events').query({ q: '.*' }))).toEqual([]);
    const broken = await api().get('/api/events').query({ q: '[a' });
    expect(broken.status).toBe(200);
    expect(broken.body.events).toEqual([]);
  });

  it('rejects a search that is too short or too long, and ignores an empty one', async () => {
    const short = await api().get('/api/events').query({ q: 'a' });
    expect(short.status).toBe(400);
    expect(short.body.errors).toHaveProperty('q');
    expect((await api().get('/api/events').query({ q: 'x'.repeat(61) })).status).toBe(400);
    expect((await api().get('/api/events').query({ q: '' })).status).toBe(200);
  });

  it('returns the chosen level plus events for everyone', async () => {
    const { user } = await makeUser();
    await insertEvent(user, { title: 'Alle', level: 'all' });
    await insertEvent(user, { title: 'Anfang', level: 'beginner' });
    await insertEvent(user, { title: 'Mittel', level: 'intermediate' });
    await insertEvent(user, { title: 'Profi', level: 'advanced' });

    expect(titles(await api().get('/api/events').query({ level: 'beginner' }))).toEqual(['Alle', 'Anfang']);
    expect(titles(await api().get('/api/events').query({ level: 'advanced' }))).toEqual(['Alle', 'Profi']);
    expect(titles(await api().get('/api/events'))).toHaveLength(4);
    expect(titles(await api().get('/api/events').query({ level: 'intermediate', q: 'mit' }))).toEqual(['Mittel']);

    const bad = await api().get('/api/events').query({ level: 'expert' });
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toHaveProperty('level');
    expect((await api().get('/api/events').query({ level: 'all' })).status).toBe(400);
  });
});
