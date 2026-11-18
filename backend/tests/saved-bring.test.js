import { describe, it, expect } from 'vitest';
import { api, makeUser, eventPayload } from './helpers.js';
import { User } from '../models/index.js';

async function createEvent(auth, over = {}) {
  const res = await api().post('/api/events').set(auth).send({ ...eventPayload(), ...over });
  expect(res.status).toBe(201);
  return res.body.event;
}

describe('saved events', () => {
  it('requires authentication', async () => {
    const { auth } = await makeUser();
    const event = await createEvent(auth);
    expect((await api().post(`/api/events/${event._id}/save`)).status).toBe(401);
    expect((await api().delete(`/api/events/${event._id}/save`)).status).toBe(401);
  });

  it('saves and unsaves idempotently and lists saved events under /me', async () => {
    const organizer = await makeUser();
    const player = await makeUser();
    const event = await createEvent(organizer.auth);

    const first = await api().post(`/api/events/${event._id}/save`).set(player.auth);
    expect(first.status).toBe(200);
    expect(first.body.event.saved).toBe(true);
    await api().post(`/api/events/${event._id}/save`).set(player.auth);
    const stored = await User.findById(player.user._id).lean();
    expect(stored.savedEvents).toHaveLength(1);

    const mine = await api().get('/api/events/me').set(player.auth);
    expect(mine.body.saved.map((e) => e._id)).toEqual([event._id]);
    expect(mine.body.saved[0].saved).toBe(true);
    expect(mine.body.joined).toEqual([]);

    const detail = await api().get(`/api/events/${event._id}`).set(player.auth);
    expect(detail.body.event.saved).toBe(true);

    const removed = await api().delete(`/api/events/${event._id}/save`).set(player.auth);
    expect(removed.status).toBe(200);
    expect(removed.body.event.saved).toBe(false);
    expect((await api().get('/api/events/me').set(player.auth)).body.saved).toEqual([]);
  });

  it('keeps bookmarks private and reports saved=false to everyone else', async () => {
    const organizer = await makeUser();
    const player = await makeUser();
    const event = await createEvent(organizer.auth);
    await api().post(`/api/events/${event._id}/save`).set(player.auth);

    const asGuest = await api().get(`/api/events/${event._id}`);
    expect(asGuest.body.event.saved).toBe(false);
    const asOrganizer = await api().get(`/api/events/${event._id}`).set(organizer.auth);
    expect(asOrganizer.body.event.saved).toBe(false);
    expect(JSON.stringify(asOrganizer.body)).not.toContain('savedEvents');
  });

  it('returns 404 for unknown events and drops bookmarks of deleted events', async () => {
    const organizer = await makeUser();
    const player = await makeUser();
    expect((await api().post('/api/events/aaaaaaaaaaaaaaaaaaaaaaaa/save').set(player.auth)).status).toBe(404);

    const event = await createEvent(organizer.auth);
    await api().post(`/api/events/${event._id}/save`).set(player.auth);
    expect((await api().delete(`/api/events/${event._id}`).set(organizer.auth)).status).toBe(200);
    const stored = await User.findById(player.user._id).lean();
    expect(stored.savedEvents).toHaveLength(0);
    expect((await api().get('/api/events/me').set(player.auth)).body.saved).toEqual([]);
  });
});

describe('what to bring and organizer info', () => {
  it('stores, cleans and updates the optional bring field', async () => {
    const { auth } = await makeUser();
    const event = await createEvent(auth, { bring: '  Hallenschuhe, <b>Wasser</b>  ' });
    expect(event.bring).toBe('Hallenschuhe, Wasser');

    const plain = await createEvent(auth);
    expect(plain.bring).toBe('');

    const updated = await api().patch(`/api/events/${event._id}`).set(auth).send({ bring: 'Nur gute Laune' });
    expect(updated.status).toBe(200);
    expect(updated.body.event.bring).toBe('Nur gute Laune');

    const tooLong = await api().post('/api/events').set(auth).send({ ...eventPayload(), bring: 'x'.repeat(201) });
    expect(tooLong.status).toBe(400);
  });

  it('shows member year and events hosted on the detail view only', async () => {
    const { auth } = await makeUser({ name: 'Olga Organizer' });
    const event = await createEvent(auth);
    await createEvent(auth);

    const detail = await api().get(`/api/events/${event._id}`);
    expect(detail.body.event.organizer.displayName).toBe('Olga O.');
    expect(detail.body.event.organizer.memberSince).toBe(new Date().getUTCFullYear());
    expect(detail.body.event.organizer.eventsHosted).toBe(2);

    const list = await api().get('/api/events');
    expect(list.body.events[0].organizer.eventsHosted).toBeUndefined();
    expect(list.body.events[0].organizer.memberSince).toBeUndefined();
    expect(JSON.stringify(list.body)).not.toContain('@');
  });
});
