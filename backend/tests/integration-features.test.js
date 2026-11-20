import { describe, it, expect } from 'vitest';
import { api, makeUser, insertEvent } from './helpers.js';
import { User, Comment, Feedback } from '../models/index.js';
import { cityKey } from '../utils/text.js';

// Cross-feature checks added when the ten features were merged.

describe('account deletion removes the newer personal data', () => {
  it('deletes own comments and alerts, and unlinks feedback', async () => {
    const host = await makeUser();
    const person = await makeUser({ password: 'secret-pass-1' });
    const event = await insertEvent(host.user);

    await Comment.create({ event: event._id, author: person.user._id, text: 'Gibt es Leibchen?' });
    await Comment.create({ event: event._id, author: host.user._id, text: 'Ja.' });
    await Feedback.create({ user: person.user._id, kind: 'idea', text: 'Mehr Sportarten wären gut.' });
    await User.updateOne(
      { _id: person.user._id },
      { $push: { alerts: { city: 'Berlin', cityKey: cityKey('Berlin'), sport: null } }, $set: { calendarKey: 'abc' } }
    );

    const res = await api().delete('/api/users/me').set(person.auth).send({ password: 'secret-pass-1' });
    expect(res.status).toBe(200);

    expect(await User.findById(person.user._id)).toBeNull();
    const left = await Comment.find({ event: event._id }).lean();
    expect(left.map((c) => c.text)).toEqual(['Ja.']);
    const fb = await Feedback.find().lean();
    expect(fb).toHaveLength(1);
    expect(fb[0].user).toBeNull();
    expect(fb[0].text).toContain('Sportarten');
  });
});

describe('skeleton fields', () => {
  it('never returns secrets from the session endpoint', async () => {
    const u = await makeUser();
    await User.updateOne({ _id: u.user._id }, { $set: { calendarKey: 'k', passwordResetTokenHash: 'h', emailVerifyTokenHash: 'v' } });
    const res = await api().get('/api/auth/me').set(u.auth);
    expect(res.status).toBe(200);
    const text = JSON.stringify(res.body);
    for (const secret of ['calendarKey', 'passwordResetTokenHash', 'emailVerifyTokenHash', 'password']) {
      expect(text).not.toContain(secret);
    }
  });
});

describe('password change in the profile', () => {
  it('keeps this device signed in with a fresh session and ends older ones', async () => {
    const u = await makeUser({ password: 'old-password-1' });
    // Make the first session clearly older than the change (JWT times have 1 s precision).
    const jwt = (await import('jsonwebtoken')).default;
    const oldToken = jwt.sign({ id: u.user._id, iat: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const oldAuth = { Authorization: `Bearer ${oldToken}` };

    const res = await api().put('/api/users/me/password').set(oldAuth).send({ currentPassword: 'old-password-1', newPassword: 'new-password-2' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();

    expect((await api().get('/api/auth/me').set(oldAuth)).status).toBe(401);
    expect((await api().get('/api/auth/me').set({ Authorization: `Bearer ${res.body.token}` })).status).toBe(200);
  });
});

describe('search alerts follow the same city matching as Discover', () => {
  it('an alert for "Frankfurt" fires for an event in "Frankfurt am Main", but not for another city', async () => {
    const { alertsSettled } = await import('../services/alerts.js');
    const { Notification } = await import('../models/index.js');
    const { eventPayload } = await import('./helpers.js');
    const host = await makeUser();
    const watcher = await makeUser();
    const other = await makeUser();
    expect((await api().post('/api/alerts').set(watcher.auth).send({ city: 'Frankfurt' })).status).toBe(201);
    expect((await api().post('/api/alerts').set(other.auth).send({ city: 'Frankenthal' })).status).toBe(201);

    const res = await api()
      .post('/api/events')
      .set(host.auth)
      .send(eventPayload({ location: { placeName: 'Mainufer', address: 'Mainkai 1', city: 'Frankfurt am Main', countryCode: 'DE', lat: 50.1, lng: 8.68 } }));
    expect(res.status).toBe(201);
    await alertsSettled();

    expect(await Notification.countDocuments({ user: watcher.user._id, type: 'new_event' })).toBe(1);
    expect(await Notification.countDocuments({ user: other.user._id, type: 'new_event' })).toBe(0);
  });
});

describe('answers to questions reach the person who asked', () => {
  it('a host message to everyone also notifies an asker who has not joined, once', async () => {
    const { Notification } = await import('../models/index.js');
    const host = await makeUser();
    const joined = await makeUser();
    const asker = await makeUser();
    const event = await insertEvent(host.user, { participants: [host.user._id, joined.user._id] });

    expect((await api().post(`/api/events/${event._id}/comments`).set(asker.auth).send({ text: 'Gibt es Leibchen?' })).status).toBe(201);
    expect((await api().post(`/api/events/${event._id}/comments`).set(joined.auth).send({ text: 'Bringt jemand einen Ball?' })).status).toBe(201);
    const res = await api().post(`/api/events/${event._id}/comments`).set(host.auth).send({ text: 'Ja, beides da.', kind: 'announcement' });
    expect(res.status).toBe(201);

    const types = async (u) => (await Notification.find({ user: u.user._id, type: { $in: ['comment', 'announcement'] } }).lean()).map((n) => n.type);
    expect(await types(asker)).toEqual(['comment']); // "Antwort zu …"
    expect(await types(joined)).toEqual(['announcement']); // told once, not twice
  });
});
