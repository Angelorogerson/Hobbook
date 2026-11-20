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
