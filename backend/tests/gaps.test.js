import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, makeUsersFast, insertEvent, hoursFromNow } from './helpers.js';
import { ConnectEvent, Group, Notification, Report, User } from '../models/index.js';
import { outbox } from '../services/mailer.js';
import { runJobs } from '../services/stammspiel.js';
import { setWeatherFetcher } from '../services/weather.js';
import { signLink } from '../utils/linkToken.js';

const H = 3600 * 1000;
const D = 24 * H;
const location = { placeName: 'Uni-Platz', address: 'Gottlieb-Daimler-Str. 1', city: 'Kaiserslautern', countryCode: 'DE', lat: 49.4245, lng: 7.7529 };

function soon(daysAhead = 3) {
  const t = new Date(Date.now() + daysAhead * D);
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(t);
  return { weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(local) + 1, startTime: '19:00' };
}

const groupPayload = (over = {}) => ({
  name: 'Basketball am Uni-Platz',
  sport: 'basketball',
  location,
  ...soon(),
  durationMin: 120,
  timezone: 'Europe/Berlin',
  maxParticipants: 4,
  minPlayers: 2,
  ...over,
});

async function createGroup(org, over) {
  const res = await api().post('/api/groups').set(org.auth).send(groupPayload(over));
  expect(res.status).toBe(201);
  return res.body.group;
}

beforeEach(() => {
  outbox.length = 0;
  setWeatherFetcher(async () => null);
});

describe('1 · account deletion and Stammspiele', () => {
  it('hands the Stammspiel to the co-host and removes every trace of the person', async () => {
    const org = await makeUser({ password: 'test-password' });
    const co = await makeUser();
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(co.auth);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    await api().post(`/api/groups/${g._id}/cohosts`).set(org.auth).send({ userId: String(co.user._id), add: true });
    await Notification.create({ user: org.user._id, type: 'invite', title: 'x' });

    const res = await api().delete('/api/users/me').set(org.auth).send({ password: 'test-password' });
    expect(res.status).toBe(200);
    const stored = await Group.findById(g._id).lean();
    expect(stored.active).toBe(true);
    expect(String(stored.organizer)).toBe(String(co.user._id));
    expect(stored.members.map((m) => String(m.user))).not.toContain(String(org.user._id));
    expect(stored.coHosts.map(String)).not.toContain(String(org.user._id));
    expect(await Notification.countDocuments({ user: co.user._id, type: 'handover' })).toBe(1);
    expect(await Notification.countDocuments({ user: org.user._id })).toBe(0);
    const ev = await ConnectEvent.findById(g.upcoming._id).lean();
    expect(String(ev.creator)).toBe(String(co.user._id));
    expect(ev.participants.map(String)).not.toContain(String(org.user._id));
    expect(ev.responses.map((r) => String(r.user))).not.toContain(String(org.user._id));
  });

  it('ends a Stammspiel without co-host and calls off the open game', async () => {
    const org = await makeUser({ password: 'test-password' });
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    await api().post(`/api/events/${g.upcoming._id}/answer`).set(p.auth).send({ answer: 'in' });
    await api().delete('/api/users/me').set(org.auth).send({ password: 'test-password' }).expect(200);
    expect((await Group.findById(g._id).lean()).active).toBe(false);
    const ev = await ConnectEvent.findById(g.upcoming._id).lean();
    expect(ev.status).toBe('cancelled');
    expect(await Notification.countDocuments({ user: p.user._id, type: 'decision_off' })).toBe(1);
  });

  it('a deleted member frees their spot for the waiting list', async () => {
    const org = await makeUser();
    const p = await makeUser({ password: 'test-password' });
    const w = await makeUser();
    const g = await createGroup(org, { maxParticipants: 2, minPlayers: 2 });
    for (const u of [p, w]) {
      await api().post(`/api/groups/${g._id}/join`).set(u.auth);
      await api().post(`/api/events/${g.upcoming._id}/answer`).set(u.auth).send({ answer: 'in' });
    }
    await api().delete('/api/users/me').set(p.auth).send({ password: 'test-password' }).expect(200);
    const ev = await ConnectEvent.findById(g.upcoming._id).lean();
    expect(ev.participants.map(String)).toContain(String(w.user._id));
    expect(ev.waitlist).toHaveLength(0);
  });
});

describe('2 · email answer links need a tap', () => {
  it('preview shows the game and changes nothing', async () => {
    const org = await makeUser();
    const p = await makeUser({ name: 'Paul Spieler' });
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    const token = signLink({ t: 'answer', u: String(p.user._id), e: g.upcoming._id, a: 'in', exp: Date.now() + D });
    const res = await api().post('/api/links/preview').send({ token });
    expect(res.status).toBe(200);
    expect(res.body.suggested).toBe('in');
    expect(res.body.name).toBe('Paul');
    expect(res.body.event.myAnswer).toBeNull();
    expect((await ConnectEvent.findById(g.upcoming._id).lean()).participants).toHaveLength(1);
  });

  it('mute link without a choice only shows the state', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    const token = signLink({ t: 'mute', u: String(p.user._id), g: g._id, exp: Date.now() + D });
    const res = await api().post('/api/links/mute').send({ token });
    expect(res.body).toMatchObject({ muted: false, preview: true });
    const stored = await Group.findById(g._id).lean();
    expect(stored.members.find((m) => String(m.user) === String(p.user._id)).muted).toBe(false);
  });
});

describe('3 · moving up shortly before kick-off needs a confirmation', () => {
  async function fullGameSoon(startInHours) {
    const org = await makeUser();
    const [a, b, c] = await makeUsersFast(3);
    const ev = await insertEvent(org.user, {
      maxParticipants: 2,
      participants: [org.user._id, a.user._id],
      waitlist: [b.user._id, c.user._id],
      status: 'full',
      startAt: hoursFromNow(startInHours),
      endAt: hoursFromNow(startInHours + 2),
    });
    return { org, a, b, c, ev };
  }

  it('holds the spot, and confirming makes it final', async () => {
    const { a, b, ev } = await fullGameSoon(3);
    await api().post(`/api/events/${ev._id}/leave`).set(a.auth).expect(200);
    let stored = await ConnectEvent.findById(ev._id).lean();
    expect(stored.participants.map(String)).toContain(String(b.user._id));
    expect(stored.pendingPromotions.map((x) => String(x.user))).toEqual([String(b.user._id)]);
    const view = await api().get(`/api/events/${ev._id}`).set(b.auth);
    expect(view.body.event.myPendingPromotion.confirmBy).toBeTruthy();
    expect(outbox.find((m) => m.to === b.user.email).subject).toMatch(/bitte bis .* bestätigen/);

    const ok = await api().post(`/api/events/${ev._id}/confirm-spot`).set(b.auth);
    expect(ok.body.confirmed).toBe(true);
    stored = await ConnectEvent.findById(ev._id).lean();
    expect(stored.pendingPromotions).toHaveLength(0);
  });

  it('passes an unconfirmed spot to the next person', async () => {
    const { a, b, c, ev } = await fullGameSoon(3);
    await api().post(`/api/events/${ev._id}/leave`).set(a.auth).expect(200);
    const summary = await runJobs(new Date(Date.now() + 31 * 60 * 1000));
    expect(summary.spotsPassed).toBe(1);
    const stored = await ConnectEvent.findById(ev._id).lean();
    expect(stored.participants.map(String)).toContain(String(c.user._id));
    expect(stored.participants.map(String)).not.toContain(String(b.user._id));
    expect(stored.pendingPromotions.map((x) => String(x.user))).toEqual([String(c.user._id)]);
    expect(await Notification.countDocuments({ user: b.user._id, type: 'spot_passed' })).toBe(1);
  });

  it('a day before, moving up stays automatic', async () => {
    const { a, b, ev } = await fullGameSoon(24);
    await api().post(`/api/events/${ev._id}/leave`).set(a.auth).expect(200);
    const stored = await ConnectEvent.findById(ev._id).lean();
    expect(stored.participants.map(String)).toContain(String(b.user._id));
    expect(stored.pendingPromotions).toHaveLength(0);
  });
});

describe('B2 · Stammspiele in Discover', () => {
  it('lists public Stammspiele by city and filters games of Stammspiele', async () => {
    const org = await makeUser();
    await createGroup(org);
    await createGroup(org, { name: 'Geheimer Kick', visibility: 'unlisted' });
    await insertEvent(org.user, { title: 'Einmalig', location: { ...location } });

    const list = await api().get('/api/groups?city=Kaisersl');
    expect(list.body.groups.map((g) => g.name)).toEqual(['Basketball am Uni-Platz']);
    expect(list.body.groups[0].upcoming).toBeTruthy();
    expect(list.body.groups[0].inviteCode).toBeUndefined();

    const near = await api().get('/api/groups?near=7.75,49.42&radiusKm=5');
    expect(near.body.groups).toHaveLength(1);

    const games = await api().get('/api/events?series=true');
    expect(games.body.events.map((e) => e.title)).toEqual(['Basketball am Uni-Platz']);
  });
});

describe('B3 · editing a Stammspiel', () => {
  it('changes the open game only when asked, and tells participants', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    await api().post(`/api/events/${g.upcoming._id}/answer`).set(p.auth).send({ answer: 'in' });

    await api().patch(`/api/groups/${g._id}`).set(org.auth).send({ name: 'Nur künftig' }).expect(200);
    expect((await ConnectEvent.findById(g.upcoming._id).lean()).title).toBe('Basketball am Uni-Platz');

    const res = await api().patch(`/api/groups/${g._id}`).set(org.auth).send({ startTime: '20:00', applyToUpcoming: true });
    expect(res.status).toBe(200);
    expect(res.body.appliedToUpcoming).toBe(true);
    const ev = await ConnectEvent.findById(g.upcoming._id).lean();
    expect(ev.title).toBe('Nur künftig');
    expect(new Date(ev.startAt) - new Date(g.upcoming.startAt)).toBe(H);
    expect(await Notification.countDocuments({ user: p.user._id, type: 'changed' })).toBe(1);
  });

  it('refuses to move this week’s game into the past or below the sign-ups', async () => {
    const org = await makeUser();
    const [a, b] = await makeUsersFast(2);
    const g = await createGroup(org);
    for (const u of [a, b]) await api().post(`/api/events/${g.upcoming._id}/answer`).set(u.auth).send({ answer: 'in' });
    const ev = await ConnectEvent.findById(g.upcoming._id).lean();
    const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(new Date(Date.now() - D));
    const yesterday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(local) + 1;
    // Only meaningful when "yesterday" lies in the same week as the game.
    if (yesterday < g.weekday) {
      const past = await api().patch(`/api/groups/${g._id}`).set(org.auth).send({ weekday: yesterday, applyToUpcoming: true });
      expect(past.status).toBe(409);
    }
    const small = await api().patch(`/api/groups/${g._id}`).set(org.auth).send({ maxParticipants: 2, minPlayers: 2, applyToUpcoming: true });
    expect(small.status).toBe(409);
    expect((await ConnectEvent.findById(ev._id).lean()).maxParticipants).toBe(4);
    expect((await Group.findById(g._id).lean()).maxParticipants).toBe(4);
  });
});

describe('B4 · late cancellations on single events', () => {
  it('counts leaving shortly before the start, not the day before', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const soonEv = await insertEvent(org.user, { startAt: hoursFromNow(1), endAt: hoursFromNow(3) });
    const laterEv = await insertEvent(org.user, { startAt: hoursFromNow(30), endAt: hoursFromNow(32) });
    for (const e of [soonEv, laterEv]) {
      await api().post(`/api/events/${e._id}/join`).set(p.auth).expect(200);
      await api().post(`/api/events/${e._id}/leave`).set(p.auth).expect(200);
    }
    const late = await ConnectEvent.countDocuments({ responses: { $elemMatch: { user: p.user._id, answer: 'out', late: true } } });
    expect(late).toBe(1);
  });

  it('leaving the waiting list is never a late cancellation', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const other = await makeUser();
    const ev = await insertEvent(org.user, { maxParticipants: 2, participants: [org.user._id, other.user._id], status: 'full', startAt: hoursFromNow(1), endAt: hoursFromNow(2) });
    await api().post(`/api/events/${ev._id}/waitlist`).set(p.auth).expect(200);
    await api().post(`/api/events/${ev._id}/leave`).set(p.auth).expect(200);
    expect(await ConnectEvent.countDocuments({ 'responses.late': true })).toBe(0);
  });
});

describe('B5 · removing, blocking and reporting people', () => {
  it('a host removes and blocks a member, who then cannot rejoin or answer', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    await api().post(`/api/events/${g.upcoming._id}/answer`).set(p.auth).send({ answer: 'in' });

    const res = await api().post(`/api/groups/${g._id}/members/${p.user._id}/remove`).set(org.auth).send({ block: true });
    expect(res.status).toBe(200);
    expect(res.body.group.blocked.map((b) => b._id)).toEqual([String(p.user._id)]);
    expect((await ConnectEvent.findById(g.upcoming._id).lean()).participants.map(String)).not.toContain(String(p.user._id));
    expect(await Notification.countDocuments({ user: p.user._id, type: 'removed' })).toBe(1);

    expect((await api().post(`/api/groups/${g._id}/join`).set(p.auth)).status).toBe(403);
    expect((await api().post(`/api/events/${g.upcoming._id}/answer`).set(p.auth).send({ answer: 'in' })).status).toBe(403);
    const token = signLink({ t: 'answer', u: String(p.user._id), e: g.upcoming._id, a: 'in', exp: Date.now() + D });
    expect((await api().post('/api/links/answer').send({ token })).status).toBe(403);
    const view = await api().get(`/api/groups/${g.inviteCode}`).set(p.auth);
    expect(view.body.group.isBlocked).toBe(true);

    await api().post(`/api/groups/${g._id}/members/${p.user._id}/unblock`).set(org.auth).expect(200);
    expect((await api().post(`/api/groups/${g._id}/join`).set(p.auth)).status).toBe(200);
  });

  it('only the organizer removes co-hosts; nobody removes the organizer', async () => {
    const org = await makeUser();
    const co = await makeUser();
    const co2 = await makeUser();
    const g = await createGroup(org);
    for (const u of [co, co2]) {
      await api().post(`/api/groups/${g._id}/join`).set(u.auth);
      await api().post(`/api/groups/${g._id}/cohosts`).set(org.auth).send({ userId: String(u.user._id), add: true });
    }
    expect((await api().post(`/api/groups/${g._id}/members/${co2.user._id}/remove`).set(co.auth).send({})).status).toBe(403);
    expect((await api().post(`/api/groups/${g._id}/members/${org.user._id}/remove`).set(co.auth).send({})).status).toBe(400);
  });

  it('reports a person; moderation can block the account, which then cannot sign in', async () => {
    const admin = await makeUser({ role: 'admin' });
    const reporter = await makeUser();
    const bad = await makeUser({ password: 'test-password', email: 'bad@hobbook.test' });
    expect((await api().post('/api/reports').set(reporter.auth).send({ userId: String(reporter.user._id), reason: 'spam' })).status).toBe(400);
    const r = await api().post('/api/reports').set(reporter.auth).send({ userId: String(bad.user._id), reason: 'inappropriate', text: 'Beleidigt' });
    expect(r.status).toBe(201);
    expect((await api().post('/api/reports').set(reporter.auth).send({ reason: 'spam' })).status).toBe(400);

    const queue = await api().get('/api/reports?status=open').set(admin.auth);
    const item = queue.body.reports.find((x) => x.targetUser);
    expect(item.targetUser).toMatchObject({ _id: String(bad.user._id), active: true });

    await api().patch(`/api/reports/${item._id}`).set(admin.auth).send({ status: 'resolved', deactivateUser: true }).expect(200);
    expect((await User.findById(bad.user._id).lean()).isActive).toBe(false);
    expect((await api().get('/api/auth/me').set(bad.auth)).status).toBe(401);
    expect((await api().post('/api/auth/login').send({ email: 'bad@hobbook.test', password: 'test-password' })).status).toBe(403);
    expect(await Report.countDocuments({ targetUser: bad.user._id })).toBe(1);
  });
});

describe('B6 · handing a Stammspiel over', () => {
  it('makes a member the organizer and the previous one a co-host', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const outsider = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    expect((await api().post(`/api/groups/${g._id}/transfer`).set(org.auth).send({ userId: String(outsider.user._id) })).status).toBe(400);
    expect((await api().post(`/api/groups/${g._id}/transfer`).set(p.auth).send({ userId: String(p.user._id) })).status).toBe(403);

    const res = await api().post(`/api/groups/${g._id}/transfer`).set(org.auth).send({ userId: String(p.user._id) });
    expect(res.status).toBe(200);
    expect(res.body.group.isOrganizer).toBe(false);
    expect(res.body.group.isHost).toBe(true);
    const stored = await Group.findById(g._id).lean();
    expect(String(stored.organizer)).toBe(String(p.user._id));
    expect(stored.coHosts.map(String)).toContain(String(org.user._id));
    expect(String((await ConnectEvent.findById(g.upcoming._id).lean()).creator)).toBe(String(p.user._id));
    expect(await Notification.countDocuments({ user: p.user._id, type: 'handover' })).toBe(1);
  });
});
