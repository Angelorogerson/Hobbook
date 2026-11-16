import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { api, makeUser, makeUsersFast, eventPayload, insertEvent, hoursFromNow } from './helpers.js';
import { ConnectEvent } from '../models/index.js';
import { SPORTS } from '../config/sports.js';

describe('sports list', () => {
  it('frontend copy matches backend canonical list', () => {
    const fe = JSON.parse(readFileSync(new URL('../../frontend/src/constants/sports.json', import.meta.url), 'utf8'));
    expect(fe).toEqual(SPORTS);
  });
});

describe('create event', () => {
  it('requires authentication', async () => {
    const res = await api().post('/api/events').send(eventPayload());
    expect(res.status).toBe(401);
  });

  it('creates an event with the creator as first participant', async () => {
    const { user, auth } = await makeUser({ name: 'Max Mustermann' });
    const res = await api().post('/api/events').set(auth).send(eventPayload());
    expect(res.status).toBe(201);
    expect(res.body.event.participantCount).toBe(1);
    expect(res.body.event.isOrganizer).toBe(true);
    expect(res.body.event.organizer.displayName).toBe('Max M.');
    expect(res.body.event.location).toMatchObject({ city: 'Berlin', lat: 52.53, lng: 13.38 });
    const stored = await ConnectEvent.findById(res.body.event._id).lean();
    expect(stored.creator.toString()).toBe(user._id.toString());
    expect(stored.location.cityKey).toBe('berlin');
  });

  it('ignores mass-assigned fields', async () => {
    const { user, auth } = await makeUser();
    const other = await makeUser();
    const res = await api()
      .post('/api/events')
      .set(auth)
      .send({ ...eventPayload(), creator: other.user._id, participants: [other.user._id], status: 'cancelled' });
    expect(res.status).toBe(201);
    const stored = await ConnectEvent.findById(res.body.event._id).lean();
    expect(stored.creator.toString()).toBe(user._id.toString());
    expect(stored.status).toBe('open');
    expect(stored.participants.map(String)).toEqual([user._id.toString()]);
  });

  it.each([
    ['past start', { startAt: hoursFromNow(-1).toISOString(), endAt: hoursFromNow(1).toISOString() }, 'startAt'],
    ['end before start', { endAt: hoursFromNow(23).toISOString() }, 'endAt'],
    ['unknown sport', { sport: 'quidditch' }, 'sport'],
    ['capacity too small', { maxParticipants: 1 }, 'maxParticipants'],
    ['invalid latitude', { location: { ...eventPayload().location, lat: 120 } }, 'location.lat'],
    ['missing city', { location: { ...eventPayload().location, city: '' } }, 'location.city'],
  ])('rejects %s', async (_label, override, field) => {
    const { auth } = await makeUser();
    const res = await api().post('/api/events').set(auth).send(eventPayload(override));
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty([field]);
  });

  it('strips HTML from text fields', async () => {
    const { auth } = await makeUser();
    const res = await api()
      .post('/api/events')
      .set(auth)
      .send(eventPayload({ title: '<b>Kick</b> am Abend<script>x</script>' }));
    expect(res.status).toBe(201);
    expect(res.body.event.title).toBe('Kick am Abendx');
  });
});

describe('discovery query', () => {
  it('is public, excludes unlisted/cancelled/past and filters by city, sport, bbox', async () => {
    const { user } = await makeUser();
    await insertEvent(user, { title: 'Berlin Fußball' });
    await insertEvent(user, { title: 'Berlin Basketball', sport: 'basketball' });
    await insertEvent(user, {
      title: 'München',
      location: { placeName: 'P', address: 'A', city: 'München', lat: 48.13, lng: 11.58 },
    });
    await insertEvent(user, { title: 'Unlisted', visibility: 'unlisted' });
    await insertEvent(user, { title: 'Abgesagt', status: 'cancelled' });
    await insertEvent(user, { title: 'Vorbei', startAt: hoursFromNow(-5), endAt: hoursFromNow(-3) });

    let res = await api().get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.events.map((e) => e.title).sort()).toEqual(['Berlin Basketball', 'Berlin Fußball', 'München']);
    expect(res.body.total).toBe(3);

    res = await api().get('/api/events?city=munchen');
    expect(res.body.events.map((e) => e.title)).toEqual(['München']);

    res = await api().get('/api/events?city=Berlin&sport=basketball');
    expect(res.body.events.map((e) => e.title)).toEqual(['Berlin Basketball']);

    res = await api().get('/api/events?bbox=11,48,12,49');
    expect(res.body.events.map((e) => e.title)).toEqual(['München']);

    res = await api().get('/api/events?near=13.38,52.53&radiusKm=10');
    expect(res.body.events).toHaveLength(2);

    res = await api().get('/api/events?includeCancelled=true&includePast=true');
    expect(res.body.total).toBe(5);
    const past = res.body.events.find((e) => e.title === 'Vorbei');
    expect(past.status).toBe('completed');
  });

  it('lists events without coordinates but marks them unmappable', async () => {
    const { user } = await makeUser();
    await insertEvent(user, { location: { placeName: 'Alt', address: 'Irgendwo', city: 'Berlin' } });
    const res = await api().get('/api/events?city=berlin');
    expect(res.body.events[0].location.lat).toBeNull();
    expect(res.body.events[0].location.lng).toBeNull();
  });

  it('paginates', async () => {
    const { user } = await makeUser();
    for (let i = 0; i < 5; i++) await insertEvent(user, { title: `E${i}`, startAt: hoursFromNow(10 + i), endAt: hoursFromNow(11 + i) });
    const res = await api().get('/api/events?limit=2&page=2');
    expect(res.body.events.map((e) => e.title)).toEqual(['E2', 'E3']);
    expect(res.body.total).toBe(5);
  });

  it('rejects malformed bbox', async () => {
    const res = await api().get('/api/events?bbox=1,2,3');
    expect(res.status).toBe(400);
  });

  it('never exposes email or participant names publicly', async () => {
    const org = await makeUser({ name: 'Olga Organisatorin' });
    const p = await makeUser({ name: 'Paul Spieler' });
    const ev = await insertEvent(org.user, { participants: [org.user._id, p.user._id] });

    const list = await api().get('/api/events');
    const text = JSON.stringify(list.body);
    expect(text).not.toContain('@hobbook.test');
    expect(text).not.toContain('Organisatorin');

    const anon = await api().get(`/api/events/${ev._id}`);
    expect(anon.body.event.participants).toBeUndefined();
    expect(JSON.stringify(anon.body)).not.toContain('@');

    const asParticipant = await api().get(`/api/events/${ev._id}`).set(p.auth);
    expect(asParticipant.body.event.joined).toBe(true);
    expect(asParticipant.body.event.participants.map((x) => x.displayName)).toEqual(['Olga O.', 'Paul S.']);
  });

  it('unlisted events are reachable by id', async () => {
    const { user } = await makeUser();
    const ev = await insertEvent(user, { visibility: 'unlisted' });
    const res = await api().get(`/api/events/${ev._id}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for malformed and unknown ids', async () => {
    expect((await api().get('/api/events/not-an-id')).status).toBe(404);
    expect((await api().get('/api/events/0123456789abcdef01234567')).status).toBe(404);
  });
});

describe('join / leave', () => {
  it('handles 50 concurrent joins on capacity 10 without overbooking', async () => {
    const org = await makeUser();
    const ev = await insertEvent(org.user, { maxParticipants: 10 });
    const players = await makeUsersFast(50);

    const results = await Promise.all(players.map((p) => api().post(`/api/events/${ev._id}/join`).set(p.auth)));
    const ok = results.filter((r) => r.status === 200).length;
    const full = results.filter((r) => r.status === 409).length;

    const stored = await ConnectEvent.findById(ev._id).lean();
    expect(stored.participants).toHaveLength(10);
    expect(new Set(stored.participants.map(String)).size).toBe(10);
    expect(stored.status).toBe('full');
    expect(ok).toBe(9); // organizer already holds 1 spot
    expect(full).toBe(41);
  }, 60000);

  it('is idempotent for the same user, even concurrently', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const ev = await insertEvent(org.user);
    const results = await Promise.all(Array.from({ length: 5 }, () => api().post(`/api/events/${ev._id}/join`).set(p.auth)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    const stored = await ConnectEvent.findById(ev._id).lean();
    expect(stored.participants).toHaveLength(2);
  });

  it('rejects joining cancelled, past or full events', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const cancelled = await insertEvent(org.user, { status: 'cancelled' });
    const past = await insertEvent(org.user, { startAt: hoursFromNow(-2), endAt: hoursFromNow(-1) });
    const full = await insertEvent(org.user, { maxParticipants: 2, participants: [org.user._id, (await makeUser()).user._id], status: 'full' });

    expect((await api().post(`/api/events/${cancelled._id}/join`).set(p.auth)).body.message).toMatch(/abgesagt/);
    expect((await api().post(`/api/events/${past._id}/join`).set(p.auth)).status).toBe(409);
    const r = await api().post(`/api/events/${full._id}/join`).set(p.auth);
    expect(r.status).toBe(409);
    expect(r.body.message).toMatch(/voll/);
  });

  it('requires authentication to join', async () => {
    const org = await makeUser();
    const ev = await insertEvent(org.user);
    expect((await api().post(`/api/events/${ev._id}/join`)).status).toBe(401);
  });

  it('leaving reopens a full event; creator cannot leave', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const ev = await insertEvent(org.user, { maxParticipants: 2 });
    await api().post(`/api/events/${ev._id}/join`).set(p.auth).expect(200);
    expect((await ConnectEvent.findById(ev._id)).status).toBe('full');

    const left = await api().post(`/api/events/${ev._id}/leave`).set(p.auth);
    expect(left.status).toBe(200);
    expect(left.body.event.status).toBe('open');
    expect(left.body.event.joined).toBe(false);

    const creatorLeave = await api().post(`/api/events/${ev._id}/leave`).set(org.auth);
    expect(creatorLeave.status).toBe(409);
  });
});

describe('edit / cancel / delete ownership', () => {
  it('only the organizer or an admin can edit', async () => {
    const org = await makeUser();
    const other = await makeUser();
    const admin = await makeUser({ role: 'admin' });
    const ev = await insertEvent(org.user);

    expect((await api().patch(`/api/events/${ev._id}`).set(other.auth).send({ title: 'Gekapert' })).status).toBe(403);
    expect((await api().patch(`/api/events/${ev._id}`).set(org.auth).send({ title: 'Neuer Titel' })).body.event.title).toBe('Neuer Titel');
    expect((await api().patch(`/api/events/${ev._id}`).set(admin.auth).send({ title: 'Admin Titel' })).status).toBe(200);
  });

  it('marks material changes and keeps unchanged fields', async () => {
    const org = await makeUser();
    const ev = await insertEvent(org.user);
    const res = await api()
      .patch(`/api/events/${ev._id}`)
      .set(org.auth)
      .send({ startAt: hoursFromNow(30).toISOString(), endAt: hoursFromNow(32).toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.event.changedAt).toBeTruthy();
    expect(res.body.event.title).toBe('Direkt');

    const titleOnly = await insertEvent(org.user);
    const r2 = await api().patch(`/api/events/${titleOnly._id}`).set(org.auth).send({ title: 'Nur Titel' });
    expect(r2.body.event.changedAt).toBeNull();
  });

  it('does not treat "$" strings as field paths', async () => {
    const org = await makeUser();
    const ev = await insertEvent(org.user);
    const res = await api().patch(`/api/events/${ev._id}`).set(org.auth).send({ title: '$participants' });
    expect(res.status).toBe(200);
    expect(res.body.event.title).toBe('$participants');
  });

  it('cannot shrink capacity below participant count; recomputes full', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const ev = await insertEvent(org.user, { maxParticipants: 5, participants: [org.user._id, p.user._id] });
    expect((await api().patch(`/api/events/${ev._id}`).set(org.auth).send({ maxParticipants: 1 })).status).toBe(400);
    const r = await api().patch(`/api/events/${ev._id}`).set(org.auth).send({ maxParticipants: 2 });
    expect(r.status).toBe(200);
    expect(r.body.event.status).toBe('full');
  });

  it('rejects editing past start into the past and editing cancelled events', async () => {
    const org = await makeUser();
    const ev = await insertEvent(org.user);
    expect(
      (await api().patch(`/api/events/${ev._id}`).set(org.auth).send({ startAt: hoursFromNow(-1).toISOString() })).status
    ).toBe(400);
    await api().post(`/api/events/${ev._id}/cancel`).set(org.auth).send({ reason: 'Regen' }).expect(200);
    expect((await api().patch(`/api/events/${ev._id}`).set(org.auth).send({ title: 'x y z' })).status).toBe(409);
  });

  it('cancel keeps a visible cancelled state with reason', async () => {
    const org = await makeUser();
    const other = await makeUser();
    const ev = await insertEvent(org.user);
    expect((await api().post(`/api/events/${ev._id}/cancel`).set(other.auth).send({})).status).toBe(403);
    const res = await api().post(`/api/events/${ev._id}/cancel`).set(org.auth).send({ reason: 'Platz gesperrt' });
    expect(res.body.event.status).toBe('cancelled');
    expect(res.body.event.cancelledReason).toBe('Platz gesperrt');
    const detail = await api().get(`/api/events/${ev._id}`);
    expect(detail.body.event.status).toBe('cancelled');
  });

  it('hard delete only without other participants (admin may always delete)', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const admin = await makeUser({ role: 'admin' });
    const lonely = await insertEvent(org.user);
    const joined = await insertEvent(org.user, { participants: [org.user._id, p.user._id] });

    expect((await api().delete(`/api/events/${lonely._id}`).set(p.auth)).status).toBe(403);
    expect((await api().delete(`/api/events/${lonely._id}`).set(org.auth)).status).toBe(200);
    expect((await api().delete(`/api/events/${joined._id}`).set(org.auth)).status).toBe(409);
    expect((await api().delete(`/api/events/${joined._id}`).set(admin.auth)).status).toBe(200);
  });
});

describe('my events', () => {
  it('returns created and joined events separately', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const a = await insertEvent(org.user, { title: 'Meins' });
    await insertEvent(p.user, { title: 'Von P' });
    await api().post(`/api/events/${a._id}/join`).set(p.auth).expect(200);

    const res = await api().get('/api/events/me').set(p.auth);
    expect(res.body.created.map((e) => e.title)).toEqual(['Von P']);
    expect(res.body.joined.map((e) => e.title)).toEqual(['Meins']);
    expect((await api().get('/api/events/me')).status).toBe(401);
  });
});
