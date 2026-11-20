import { describe, it, expect } from 'vitest';
import { api, makeUser, insertEvent } from './helpers.js';
import { Feedback, Group } from '../models/index.js';
import { cityKey } from '../utils/text.js';
import { pagePath } from '../validation/feedbackSchemas.js';

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);

const place = (name, lat, lng, extra = {}) => ({ placeName: name, address: `${name} 1`, city: 'Berlin', lat, lng, ...extra });

async function insertGroup(organizer, location, overrides = {}) {
  return Group.create({
    name: 'Mittwochskick',
    sport: 'football',
    organizer: organizer._id,
    weekday: 3,
    startTime: '18:30',
    durationMin: 90,
    maxParticipants: 10,
    minPlayers: 6,
    inviteCode: `code${Math.random().toString(36).slice(2, 10)}`,
    location: {
      placeName: location.placeName,
      address: location.address,
      city: location.city,
      cityKey: cityKey(location.city),
      countryCode: location.countryCode,
      point: { type: 'Point', coordinates: [location.lng, location.lat] },
    },
    ...overrides,
  });
}

describe('GET /api/places/mine', () => {
  it('needs a login', async () => {
    const res = await api().get('/api/places/mine');
    expect(res.status).toBe(401);
  });

  it('is empty for someone who has not hosted anything', async () => {
    const { auth } = await makeUser();
    const res = await api().get('/api/places/mine').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ places: [] });
  });

  it('returns distinct places, newest first, in the shape the form needs', async () => {
    const { user, auth } = await makeUser();
    await insertEvent(user, { location: place('Volkspark', 52.53, 13.38), createdAt: minutesAgo(50) });
    await insertEvent(user, { location: place('Mauerpark', 52.5437, 13.4022), createdAt: minutesAgo(40) });
    // Same place again, the pin a few metres off (same to 4 decimals) and other casing.
    await insertEvent(user, { location: place('volkspark', 52.53001, 13.38002), createdAt: minutesAgo(30) });
    // Same name, another spot: a different place.
    await insertEvent(user, { location: place('Volkspark', 52.48, 13.34), createdAt: minutesAgo(20) });
    // No coordinates (legacy data): left out.
    await insertEvent(user, { location: { placeName: 'Ohne Pin', address: 'Irgendwo 1', city: 'Berlin' }, createdAt: minutesAgo(10) });

    const res = await api().get('/api/places/mine').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.places).toEqual([
      { placeName: 'Volkspark', address: 'Volkspark 1', city: 'Berlin', lat: 52.48, lng: 13.34 },
      { placeName: 'volkspark', address: 'volkspark 1', city: 'Berlin', lat: 52.53001, lng: 13.38002 },
      { placeName: 'Mauerpark', address: 'Mauerpark 1', city: 'Berlin', lat: 52.5437, lng: 13.4022 },
    ]);
  });

  it('includes the places of Stammspiele the person organizes, with the country code', async () => {
    const { user, auth } = await makeUser();
    const other = await makeUser();
    await insertEvent(user, { location: place('Volkspark', 52.53, 13.38), createdAt: minutesAgo(30) });
    await insertGroup(user, place('Soccerhalle', 52.51, 13.45, { countryCode: 'DE' }), { createdAt: minutesAgo(5) });
    // A Stammspiel where the person is only a member does not count.
    await insertGroup(other.user, place('Fremde Halle', 52.4, 13.2), { members: [{ user: user._id }] });

    const res = await api().get('/api/places/mine').set(auth);
    expect(res.body.places.map((p) => p.placeName)).toEqual(['Soccerhalle', 'Volkspark']);
    expect(res.body.places[0]).toEqual({ placeName: 'Soccerhalle', address: 'Soccerhalle 1', city: 'Berlin', countryCode: 'DE', lat: 52.51, lng: 13.45 });
  });

  it('stops at five places', async () => {
    const { user, auth } = await makeUser();
    for (let i = 0; i < 7; i++) {
      await insertEvent(user, { location: place(`Platz ${i}`, 52.5 + i / 100, 13.4), createdAt: minutesAgo(100 - i) });
    }
    const res = await api().get('/api/places/mine').set(auth);
    expect(res.body.places.map((p) => p.placeName)).toEqual(['Platz 6', 'Platz 5', 'Platz 4', 'Platz 3', 'Platz 2']);
  });

  it("never shows another person's places", async () => {
    const me = await makeUser();
    const other = await makeUser();
    await insertEvent(other.user, { location: place('Geheimer Hof', 48.1, 11.5) });
    // Taking part in someone's event does not make it "my place".
    await insertEvent(other.user, { location: place('Fremder Park', 48.2, 11.6), participants: [other.user._id, me.user._id] });
    await insertEvent(me.user, { location: place('Mein Platz', 52.5, 13.4) });

    const res = await api().get('/api/places/mine').set(me.auth);
    expect(res.body.places.map((p) => p.placeName)).toEqual(['Mein Platz']);
  });
});

describe('POST /api/feedback', () => {
  it('stores feedback from a guest', async () => {
    const res = await api().post('/api/feedback').send({ kind: 'idea', text: 'Bitte eine Suche nach Uhrzeit.' });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/Danke/);
    const stored = await Feedback.find().lean();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ user: null, kind: 'idea', text: 'Bitte eine Suche nach Uhrzeit.', page: '', status: 'open' });
  });

  it('stores the account of a signed-in person', async () => {
    const { user, auth } = await makeUser();
    const res = await api().post('/api/feedback').set(auth).send({ kind: 'praise', text: 'Läuft super bei uns!' });
    expect(res.status).toBe(201);
    const stored = await Feedback.findOne().lean();
    expect(String(stored.user)).toBe(String(user._id));
    expect(stored.kind).toBe('praise');
  });

  it('treats a broken login token like a guest', async () => {
    const res = await api().post('/api/feedback').set({ Authorization: 'Bearer kaputt' }).send({ kind: 'other', text: 'Hallo zusammen' });
    expect(res.status).toBe(201);
    expect((await Feedback.findOne().lean()).user).toBeNull();
  });

  it('strips HTML from the text', async () => {
    const res = await api().post('/api/feedback').send({ kind: 'problem', text: '<b>Die Karte</b> lädt <script>alert(1)</script>nicht' });
    expect(res.status).toBe(201);
    const stored = await Feedback.findOne().lean();
    expect(stored.text).toBe('Die Karte lädt alert(1)nicht');
    expect(stored.text).not.toMatch(/[<>]/);
  });

  it('rejects text that is too short, also when only HTML made it long enough', async () => {
    const short = await api().post('/api/feedback').send({ kind: 'idea', text: 'Hm' });
    expect(short.status).toBe(400);
    expect(short.body.errors.text).toBeTruthy();
    const onlyTags = await api().post('/api/feedback').send({ kind: 'idea', text: '<p><b>Hi</b></p>' });
    expect(onlyTags.status).toBe(400);
    const missing = await api().post('/api/feedback').send({ kind: 'idea' });
    expect(missing.status).toBe(400);
    expect(await Feedback.countDocuments()).toBe(0);
  });

  it('rejects text that is too long and an unknown kind', async () => {
    const long = await api().post('/api/feedback').send({ kind: 'idea', text: 'a'.repeat(2001) });
    expect(long.status).toBe(400);
    const kind = await api().post('/api/feedback').send({ kind: 'spam', text: 'Das ist ein Text' });
    expect(kind.status).toBe(400);
    expect(kind.body.errors.kind).toBeTruthy();
    expect(await Feedback.countDocuments()).toBe(0);
  });

  it('answers the honeypot with 201 but stores nothing', async () => {
    const res = await api().post('/api/feedback').send({ kind: 'idea', text: 'Kaufen Sie jetzt billig ein', website: 'https://spam.example' });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/Danke/);
    expect(await Feedback.countDocuments()).toBe(0);
  });

  it('stores normally when the honeypot is empty', async () => {
    const res = await api().post('/api/feedback').send({ kind: 'idea', text: 'Ein ehrlicher Vorschlag', website: '' });
    expect(res.status).toBe(201);
    expect(await Feedback.countDocuments()).toBe(1);
  });

  it('keeps only the path of the page', async () => {
    await api().post('/api/feedback').send({ kind: 'problem', text: 'Hier hakt es', page: '/events/abc123?token=geheim&x=1#kommentare' });
    const stored = await Feedback.findOne().lean();
    expect(stored.page).toBe('/events/abc123');
  });

  it('reduces odd page values to a path or nothing', () => {
    expect(pagePath('https://hobbook.example/profil?tab=1')).toBe('/profil');
    expect(pagePath('/entdecken#karte')).toBe('/entdecken');
    expect(pagePath('javascript:alert(1)')).toBe('');
    expect(pagePath('//evil.example/x')).toBe('');
    expect(pagePath('?nur=query')).toBe('');
    expect(pagePath(`/${'a'.repeat(400)}`)).toHaveLength(200);
    expect(pagePath(undefined)).toBe('');
  });
});

describe('feedback inbox (admins)', () => {
  const send = (body, auth) => {
    const req = api().post('/api/feedback');
    if (auth) req.set(auth);
    return req.send(body);
  };

  it('is closed to guests and normal accounts', async () => {
    const { auth } = await makeUser();
    await send({ kind: 'idea', text: 'Ein Vorschlag' });
    const id = String((await Feedback.findOne().lean())._id);

    expect((await api().get('/api/feedback')).status).toBe(401);
    expect((await api().get('/api/feedback').set(auth)).status).toBe(403);
    expect((await api().patch(`/api/feedback/${id}`).send({ status: 'done' })).status).toBe(401);
    expect((await api().patch(`/api/feedback/${id}`).set(auth).send({ status: 'done' })).status).toBe(403);
    expect((await api().delete(`/api/feedback/${id}`)).status).toBe(401);
    expect((await api().delete(`/api/feedback/${id}`).set(auth)).status).toBe(403);

    const stored = await Feedback.findById(id).lean();
    expect(stored.status).toBe('open');
  });

  it('lists newest first with a public name and never an email address', async () => {
    const admin = await makeUser({ role: 'admin' });
    const sender = await makeUser({ name: 'Max Mustermann', email: 'max.geheim@hobbook.test' });
    await send({ kind: 'idea', text: 'Erste Nachricht' });
    await send({ kind: 'problem', text: 'Zweite Nachricht', page: '/meine-events' }, sender.auth);

    const res = await api().get('/api/feedback').set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.feedback.map((f) => f.text)).toEqual(['Zweite Nachricht', 'Erste Nachricht']);
    expect(res.body.feedback[0]).toMatchObject({ kind: 'problem', page: '/meine-events', status: 'open', from: 'Max M.' });
    expect(res.body.feedback[1].from).toBe('Gast');
    expect(Object.keys(res.body.feedback[0]).sort()).toEqual(['_id', 'createdAt', 'from', 'kind', 'page', 'status', 'text']);

    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('max.geheim@hobbook.test');
    expect(raw).not.toContain('@');
    expect(raw).not.toContain('Mustermann');
  });

  it('filters by status and can mark feedback as done and open it again', async () => {
    const admin = await makeUser({ role: 'admin' });
    await send({ kind: 'idea', text: 'Bleibt offen' });
    await send({ kind: 'idea', text: 'Wird erledigt' });
    const target = await Feedback.findOne({ text: 'Wird erledigt' }).lean();

    const done = await api().patch(`/api/feedback/${target._id}`).set(admin.auth).send({ status: 'done' });
    expect(done.status).toBe(200);
    expect(done.body.feedback).toMatchObject({ _id: String(target._id), status: 'done', from: 'Gast' });

    const open = await api().get('/api/feedback?status=open').set(admin.auth);
    expect(open.body.feedback.map((f) => f.text)).toEqual(['Bleibt offen']);
    const closed = await api().get('/api/feedback?status=done').set(admin.auth);
    expect(closed.body.feedback.map((f) => f.text)).toEqual(['Wird erledigt']);

    const reopened = await api().patch(`/api/feedback/${target._id}`).set(admin.auth).send({ status: 'open' });
    expect(reopened.body.feedback.status).toBe('open');

    expect((await api().patch(`/api/feedback/${target._id}`).set(admin.auth).send({ status: 'weg' })).status).toBe(400);
    expect((await api().get('/api/feedback?status=weg').set(admin.auth)).status).toBe(400);
  });

  it('deletes feedback and answers 404 for unknown ids', async () => {
    const admin = await makeUser({ role: 'admin' });
    await send({ kind: 'other', text: 'Kann weg' });
    const target = await Feedback.findOne().lean();

    const res = await api().delete(`/api/feedback/${target._id}`).set(admin.auth);
    expect(res.status).toBe(200);
    expect(await Feedback.countDocuments()).toBe(0);

    expect((await api().delete(`/api/feedback/${target._id}`).set(admin.auth)).status).toBe(404);
    expect((await api().patch(`/api/feedback/${target._id}`).set(admin.auth).send({ status: 'done' })).status).toBe(404);
    expect((await api().delete('/api/feedback/kein-objekt').set(admin.auth)).status).toBe(404);
  });
});
