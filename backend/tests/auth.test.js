import { describe, it, expect } from 'vitest';
import { api, makeUser } from './helpers.js';
import { User } from '../models/index.js';

const valid = (overrides = {}) => ({
  name: 'Nina Neu',
  email: `nina-${Date.now()}-${Math.random().toString(36).slice(2)}@hobbook.test`,
  password: 'test-password-9',
  ageConfirmed: true,
  ...overrides,
});

describe('register', () => {
  it('creates an account, stores the age confirmation and returns a session', async () => {
    const body = valid({ email: `  MiXed-${Date.now()}@Hobbook.Test ` });
    const res = await api().post('/api/auth/register').send(body);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(body.email.trim().toLowerCase());
    expect(res.body.user.password).toBeUndefined();
    const stored = await User.findById(res.body.user._id);
    expect(stored.ageConfirmedAt).toBeInstanceOf(Date);
  });

  it('requires the 16+ confirmation', async () => {
    for (const ageConfirmed of [undefined, false, 'true']) {
      const res = await api().post('/api/auth/register').send(valid({ ageConfirmed }));
      expect(res.status).toBe(400);
      expect(res.body.errors.ageConfirmed).toBeTruthy();
    }
  });

  it('rejects short passwords, bad emails and non-string fields', async () => {
    expect((await api().post('/api/auth/register').send(valid({ password: 'short' }))).status).toBe(400);
    expect((await api().post('/api/auth/register').send(valid({ email: 'no-at-sign' }))).status).toBe(400);
    expect((await api().post('/api/auth/register').send(valid({ email: { $gt: '' } }))).status).toBe(400);
    expect((await api().post('/api/auth/register').send(valid({ name: ['a', 'b'] }))).status).toBe(400);
  });

  it('cannot set the role and rejects duplicate emails', async () => {
    const body = valid({ role: 'admin' });
    const first = await api().post('/api/auth/register').send(body);
    expect(first.body.user.role).toBe('user');
    expect((await api().post('/api/auth/register').send(body)).status).toBe(400);
  });
});

describe('login', () => {
  it('signs in with the right password, case-insensitive email', async () => {
    const { user } = await makeUser({ password: 'right-password' });
    const ok = await api().post('/api/auth/login').send({ email: user.email.toUpperCase(), password: 'right-password' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    const bad = await api().post('/api/auth/login').send({ email: user.email, password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  it('rejects query-operator objects instead of passing them to MongoDB', async () => {
    await makeUser({ password: 'right-password' });
    const res = await api().post('/api/auth/login').send({ email: { $gt: '' }, password: 'right-password' });
    expect(res.status).toBe(400);
    const res2 = await api().post('/api/auth/login').send({ email: 'a@b.de', password: { $ne: null } });
    expect(res2.status).toBe(400);
  });
});

describe('session and password routes', () => {
  it('GET /auth/me returns only public account fields', async () => {
    const u = await makeUser();
    const res = await api().get('/api/auth/me').set(u.auth);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.user).sort()).toEqual(['_id', 'city', 'email', 'emailNotifications', 'emailVerified', 'name', 'role', 'sports']);
  });

  it('password change and account deletion reject non-string input with 400', async () => {
    const u = await makeUser();
    const pw = await api().put('/api/users/me/password').set(u.auth).send({ currentPassword: { $ne: 1 }, newPassword: 'new-password-1' });
    expect(pw.status).toBe(400);
    const del = await api().delete('/api/users/me').set(u.auth).send({ password: ['x'] });
    expect(del.status).toBe(400);
    expect(await User.findById(u.user._id)).not.toBeNull();
  });
});
