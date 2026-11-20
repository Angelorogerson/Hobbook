import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { api, makeUser } from './helpers.js';
import { User } from '../models/index.js';
import { outbox } from '../services/mailer.js';
import { appUrl } from '../utils/linkToken.js';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

/** A session token as it would have been issued `secondsAgo` seconds ago. */
const sessionFrom = (user, secondsAgo) =>
  jwt.sign({ id: user._id, iat: Math.floor(Date.now() / 1000) - secondsAgo }, process.env.JWT_SECRET, { expiresIn: '1h' });

const linkToken = (mail, path) => {
  const m = new RegExp(`${appUrl()}/${path}/([a-f0-9]{64})`).exec(mail.text);
  expect(m, `link to /${path}/… in the email`).not.toBeNull();
  expect(mail.html).toContain(`${appUrl()}/${path}/${m[1]}`);
  return m[1];
};

const registration = (overrides = {}) => ({
  name: 'Nina Neu',
  email: `nina-${Date.now()}-${Math.random().toString(36).slice(2)}@hobbook.test`,
  password: 'test-password-9',
  ageConfirmed: true,
  ...overrides,
});

async function requestReset(email) {
  const before = outbox.length;
  const res = await api().post('/api/auth/forgot').send({ email });
  expect(res.status).toBe(200);
  expect(outbox.length).toBe(before + 1);
  return linkToken(outbox.at(-1), 'passwort-neu');
}

beforeEach(() => {
  outbox.length = 0;
});

describe('password reset: asking for a link', () => {
  it('answers the same for unknown and known addresses and emails only the known one', async () => {
    const { user } = await makeUser();

    const unknown = await api().post('/api/auth/forgot').send({ email: 'niemand@hobbook.test' });
    expect(unknown.status).toBe(200);
    expect(outbox).toHaveLength(0);

    const known = await api().post('/api/auth/forgot').send({ email: `  ${user.email.toUpperCase()} ` });
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(known.body.message).toBeTruthy();

    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe(user.email);
    expect(outbox[0].subject).toMatch(/Passwort/);
    const token = linkToken(outbox[0], 'passwort-neu');

    // Only the hash is stored, with an expiry of about 60 minutes.
    const stored = await User.findById(user._id).select('+passwordResetTokenHash +passwordResetExpires');
    expect(stored.passwordResetTokenHash).toBe(sha256(token));
    expect(stored.passwordResetTokenHash).not.toBe(token);
    const minutes = (stored.passwordResetExpires - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(58);
    expect(minutes).toBeLessThanOrEqual(60);
  });

  it('sends nothing for a blocked account, with the same answer', async () => {
    const { user } = await makeUser();
    await User.updateOne({ _id: user._id }, { isActive: false });
    const res = await api().post('/api/auth/forgot').send({ email: user.email });
    const unknown = await api().post('/api/auth/forgot').send({ email: 'niemand@hobbook.test' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(unknown.body);
    expect(outbox).toHaveLength(0);
  });
});

describe('password reset: using the link', () => {
  it('sets the new password, signs in and works only once', async () => {
    const { user } = await makeUser({ password: 'old-password-1' });
    const token = await requestReset(user.email);

    const res = await api().post('/api/auth/reset').send({ token, password: 'new-password-2' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ _id: String(user._id), email: user.email, name: user.name, role: 'user' });
    expect(res.body.user.password).toBeUndefined();

    // The new session works, and so does the new password; the old one does not.
    expect((await api().get('/api/auth/me').set(bearer(res.body.token))).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email: user.email, password: 'new-password-2' })).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email: user.email, password: 'old-password-1' })).status).toBe(401);

    // The reset fields are gone and the link is used up.
    const stored = await User.findById(user._id).select('+passwordResetTokenHash +passwordResetExpires');
    expect(stored.passwordResetTokenHash).toBeUndefined();
    expect(stored.passwordResetExpires).toBeUndefined();
    const again = await api().post('/api/auth/reset').send({ token, password: 'third-password-3' });
    expect(again.status).toBe(400);
    expect(again.body.message).toMatch(/ungültig oder abgelaufen/);
    expect(again.body.errors.token).toBeTruthy();
    expect((await api().post('/api/auth/login').send({ email: user.email, password: 'new-password-2' })).status).toBe(200);
  });

  it('rejects an expired link, an unknown link and a short password', async () => {
    const { user } = await makeUser({ password: 'old-password-1' });
    const token = await requestReset(user.email);

    const short = await api().post('/api/auth/reset').send({ token, password: 'short' });
    expect(short.status).toBe(400);
    expect(short.body.errors.password).toBeTruthy();

    const unknown = await api().post('/api/auth/reset').send({ token: 'a'.repeat(64), password: 'new-password-2' });
    expect(unknown.status).toBe(400);

    await User.updateOne({ _id: user._id }, { passwordResetExpires: new Date(Date.now() - 1000) });
    const expired = await api().post('/api/auth/reset').send({ token, password: 'new-password-2' });
    expect(expired.status).toBe(400);
    expect(expired.body.errors.token).toBeTruthy();

    expect((await api().post('/api/auth/login').send({ email: user.email, password: 'old-password-1' })).status).toBe(200);
  });

  it('a newer link replaces the older one', async () => {
    const { user } = await makeUser();
    const first = await requestReset(user.email);
    const second = await requestReset(user.email);
    expect(second).not.toBe(first);
    expect((await api().post('/api/auth/reset').send({ token: first, password: 'new-password-2' })).status).toBe(400);
    expect((await api().post('/api/auth/reset').send({ token: second, password: 'new-password-2' })).status).toBe(200);
  });

  it('does not work for an account that was blocked in the meantime', async () => {
    const { user } = await makeUser({ password: 'old-password-1' });
    const token = await requestReset(user.email);
    await User.updateOne({ _id: user._id }, { isActive: false });

    const res = await api().post('/api/auth/reset').send({ token, password: 'new-password-2' });
    expect(res.status).toBe(403);
    expect(res.body.token).toBeUndefined();
    const stored = await User.findById(user._id).select('+password');
    expect(await stored.comparePassword('old-password-1')).toBe(true);
  });

  it('ends sessions from before the reset: protected routes say 401, public routes see a guest', async () => {
    const { user } = await makeUser();
    await User.updateOne({ _id: user._id }, { emailVerifiedAt: new Date() });
    const oldSession = sessionFrom(user, 60);
    expect((await api().get('/api/auth/me').set(bearer(oldSession))).status).toBe(200);

    const token = await requestReset(user.email);
    const res = await api().post('/api/auth/reset').send({ token, password: 'new-password-2' });
    expect(res.status).toBe(200);
    const stored = await User.findById(user._id);
    expect(stored.passwordChangedAt).toBeInstanceOf(Date);

    const rejected = await api().get('/api/auth/me').set(bearer(oldSession));
    expect(rejected.status).toBe(401);
    expect(rejected.body.message).toMatch(/melde dich neu an/);
    expect((await api().get('/api/auth/me').set(bearer(res.body.token))).status).toBe(200);

    // /auth/verify uses optionalAuth: it only answers "schon bestätigt" to a
    // signed-in, confirmed person. The old session no longer counts as signed in.
    const unused = 'b'.repeat(64);
    const asOld = await api().post('/api/auth/verify').set(bearer(oldSession)).send({ token: unused });
    expect(asOld.status).toBe(400);
    const asNew = await api().post('/api/auth/verify').set(bearer(res.body.token)).send({ token: unused });
    expect(asNew.status).toBe(200);
    expect(asNew.body.alreadyVerified).toBe(true);
  });

  it('a password change in the profile also ends older sessions', async () => {
    const { user } = await makeUser({ password: 'old-password-1' });
    const oldSession = sessionFrom(user, 60);
    const change = await api()
      .put('/api/users/me/password')
      .set(bearer(oldSession))
      .send({ currentPassword: 'old-password-1', newPassword: 'new-password-2' });
    expect(change.status).toBe(200);
    expect((await api().get('/api/auth/me').set(bearer(oldSession))).status).toBe(401);
    const login = await api().post('/api/auth/login').send({ email: user.email, password: 'new-password-2' });
    expect((await api().get('/api/auth/me').set(bearer(login.body.token))).status).toBe(200);
  });

  it('confirms the email address too, because the link went to that address', async () => {
    const reg = await api().post('/api/auth/register').send(registration());
    expect(reg.body.user.emailVerified).toBe(false);
    const token = await requestReset(reg.body.user.email);
    const res = await api().post('/api/auth/reset').send({ token, password: 'new-password-2' });
    expect(res.body.user.emailVerified).toBe(true);
  });
});

describe('email confirmation', () => {
  it('registration sends a link, the link confirms the address and works once', async () => {
    const body = registration();
    const reg = await api().post('/api/auth/register').send(body);
    expect(reg.status).toBe(201);
    expect(reg.body.user.emailVerified).toBe(false);

    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe(body.email);
    expect(outbox[0].subject).toMatch(/bestätige/);
    const token = linkToken(outbox[0], 'email-bestaetigen');

    const stored = await User.findById(reg.body.user._id).select('+emailVerifyTokenHash +emailVerifyExpires');
    expect(stored.emailVerifyTokenHash).toBe(sha256(token));
    const days = (stored.emailVerifyExpires - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);

    // Nothing is blocked before confirming.
    const auth = bearer(reg.body.token);
    const meBefore = await api().get('/api/auth/me').set(auth);
    expect(meBefore.status).toBe(200);
    expect(meBefore.body.user.emailVerified).toBe(false);

    // Confirming needs no session (the link may be opened on another device).
    const res = await api().post('/api/auth/verify').send({ token });
    expect(res.status).toBe(200);
    expect(res.body.emailVerified).toBe(true);

    const after = await User.findById(reg.body.user._id).select('+emailVerifyTokenHash +emailVerifyExpires');
    expect(after.emailVerifiedAt).toBeInstanceOf(Date);
    expect(after.emailVerifyTokenHash).toBeUndefined();
    expect(after.emailVerifyExpires).toBeUndefined();
    expect((await api().get('/api/auth/me').set(auth)).body.user.emailVerified).toBe(true);
    const login = await api().post('/api/auth/login').send({ email: body.email, password: body.password });
    expect(login.body.user.emailVerified).toBe(true);

    // Second click: fine for the signed-in person, a clear 400 for anyone else.
    const againSignedIn = await api().post('/api/auth/verify').set(auth).send({ token });
    expect(againSignedIn.status).toBe(200);
    expect(againSignedIn.body).toMatchObject({ emailVerified: true, alreadyVerified: true });
    const againGuest = await api().post('/api/auth/verify').send({ token });
    expect(againGuest.status).toBe(400);
    expect(againGuest.body.message).toMatch(/ungültig/);
  });

  it('rejects an expired link', async () => {
    const reg = await api().post('/api/auth/register').send(registration());
    const token = linkToken(outbox[0], 'email-bestaetigen');
    await User.updateOne({ _id: reg.body.user._id }, { emailVerifyExpires: new Date(Date.now() - 1000) });
    const res = await api().post('/api/auth/verify').set(bearer(reg.body.token)).send({ token });
    expect(res.status).toBe(400);
    expect((await api().get('/api/auth/me').set(bearer(reg.body.token))).body.user.emailVerified).toBe(false);
  });

  it('resend sends a fresh link that replaces the first one', async () => {
    const reg = await api().post('/api/auth/register').send(registration());
    const auth = bearer(reg.body.token);
    const first = linkToken(outbox[0], 'email-bestaetigen');

    const resend = await api().post('/api/auth/verify/resend').set(auth);
    expect(resend.status).toBe(200);
    expect(resend.body.emailVerified).toBe(false);
    expect(outbox).toHaveLength(2);
    expect(outbox[1].to).toBe(reg.body.user.email);
    const second = linkToken(outbox[1], 'email-bestaetigen');
    expect(second).not.toBe(first);

    expect((await api().post('/api/auth/verify').send({ token: first })).status).toBe(400);
    expect((await api().post('/api/auth/verify').send({ token: second })).status).toBe(200);

    // Already confirmed: says so and sends nothing.
    const done = await api().post('/api/auth/verify/resend').set(auth);
    expect(done.status).toBe(200);
    expect(done.body.emailVerified).toBe(true);
    expect(done.body.message).toMatch(/schon bestätigt/);
    expect(outbox).toHaveLength(2);
  });

  it('resend needs a session and also works for accounts from before this feature', async () => {
    expect((await api().post('/api/auth/verify/resend')).status).toBe(401);

    const old = await makeUser();
    const me = await api().get('/api/auth/me').set(old.auth);
    expect(me.body.user.emailVerified).toBe(false);
    expect(Object.keys(me.body.user).sort()).toEqual([
      '_id',
      'city',
      'email',
      'emailNotifications',
      'emailVerified',
      'name',
      'role',
      'sports',
    ]);

    const resend = await api().post('/api/auth/verify/resend').set(old.auth);
    expect(resend.status).toBe(200);
    const token = linkToken(outbox.at(-1), 'email-bestaetigen');
    expect((await api().post('/api/auth/verify').send({ token })).status).toBe(200);
  });
});

describe('when the mail service is down', () => {
  beforeEach(() => {
    process.env.MAIL_DRIVER = 'brevo';
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('mail service down'))));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    delete process.env.MAIL_DRIVER;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('registration and the forgot answer still succeed; resend says the email was not sent', async () => {
    const reg = await api().post('/api/auth/register').send(registration());
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);

    const forgot = await api().post('/api/auth/forgot').send({ email: reg.body.user.email });
    expect(forgot.status).toBe(200);

    const resend = await api().post('/api/auth/verify/resend').set(bearer(reg.body.token));
    expect(resend.status).toBe(503);
    expect(resend.body.message).toMatch(/nicht gesendet/);
  });
});

describe('input validation', () => {
  it('non-string and malformed input gives 400 and never reaches the database', async () => {
    const { user } = await makeUser();
    const token = await requestReset(user.email);
    const bad = [
      ['/api/auth/forgot', {}],
      ['/api/auth/forgot', { email: { $gt: '' } }],
      ['/api/auth/forgot', { email: ['a@b.de'] }],
      ['/api/auth/forgot', { email: 'no-at-sign' }],
      ['/api/auth/reset', { password: 'new-password-2' }],
      ['/api/auth/reset', { token: { $ne: null }, password: 'new-password-2' }],
      ['/api/auth/reset', { token: [token], password: 'new-password-2' }],
      ['/api/auth/reset', { token: 'kurz', password: 'new-password-2' }],
      ['/api/auth/reset', { token, password: { $gt: '' } }],
      ['/api/auth/reset', { token, password: 12345678 }],
      ['/api/auth/verify', {}],
      ['/api/auth/verify', { token: { $gt: '' } }],
      ['/api/auth/verify', { token: 123 }],
      ['/api/auth/verify', { token: 'kurz' }],
    ];
    for (const [url, body] of bad) {
      const res = await api().post(url).send(body);
      expect(res.status, `${url} ${JSON.stringify(body)}`).toBe(400);
      expect(res.body.message, `${url} ${JSON.stringify(body)}`).toBeTruthy();
    }
    // The real link still works afterwards: none of the bad requests used it up.
    expect((await api().post('/api/auth/reset').send({ token, password: 'new-password-2' })).status).toBe(200);
  });
});
