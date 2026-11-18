import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, makeUsersFast, insertEvent } from './helpers.js';
import { ConnectEvent, Group, Notification } from '../models/index.js';
import { outbox } from '../services/mailer.js';
import { runJobs, nextOccurrence } from '../services/stammspiel.js';
import { setWeatherFetcher } from '../services/weather.js';
import { signLink, verifyLink } from '../utils/linkToken.js';

const H = 3600 * 1000;
const D = 24 * H;

const location = { placeName: 'Uni-Platz', address: 'Gottlieb-Daimler-Str. 1', city: 'Kaiserslautern', countryCode: 'DE', lat: 49.4245, lng: 7.7529 };

/** A weekday/time that is 3 days from now in Berlin, so the first game is soon but not too soon. */
function soon(daysAhead = 3) {
  const t = new Date(Date.now() + daysAhead * D);
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(t);
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(local) + 1;
  return { weekday, startTime: '19:00' };
}

const groupPayload = (over = {}) => ({
  name: 'Basketball am Uni-Platz',
  sport: 'basketball',
  location,
  ...soon(),
  durationMin: 120,
  timezone: 'Europe/Berlin',
  maxParticipants: 4,
  minPlayers: 3,
  deadlineHours: 3,
  openDaysBefore: 5,
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

describe('time zones', () => {
  it('keeps 19:00 local across the spring DST change', () => {
    const g = { weekday: 7, startTime: '19:00', timezone: 'Europe/Berlin', skipDates: [], durationMin: 90 };
    expect(nextOccurrence(g, new Date('2026-03-20T12:00:00Z')).startAt.toISOString()).toBe('2026-03-22T18:00:00.000Z');
    expect(nextOccurrence(g, new Date('2026-03-27T12:00:00Z')).startAt.toISOString()).toBe('2026-03-29T17:00:00.000Z');
    expect(nextOccurrence({ ...g, skipDates: ['2026-03-29'] }, new Date('2026-03-27T12:00:00Z')).dateKey).toBe('2026-04-05');
  });

  it('keeps 19:00 local across the autumn DST change', () => {
    const g = { weekday: 7, startTime: '19:00', timezone: 'Europe/Berlin', skipDates: [], durationMin: 90 };
    expect(nextOccurrence(g, new Date('2026-10-23T12:00:00Z')).startAt.toISOString()).toBe('2026-10-25T18:00:00.000Z');
  });
});

describe('creating and joining a Stammspiel', () => {
  it('creates the group and its first game with the organizer in', async () => {
    const org = await makeUser({ name: 'Olga Orga' });
    const g = await createGroup(org);
    expect(g.isOrganizer).toBe(true);
    expect(g.inviteCode).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(g.upcoming.series.name).toBe('Basketball am Uni-Platz');
    expect(g.upcoming.counts).toMatchObject({ in: 1, out: 0, waiting: 0, noAnswer: 0 });
    expect(g.upcoming.myAnswer).toBe('in');
    expect(g.upcoming.decision).toBe('open');
    expect(new Date(g.upcoming.deadlineAt).getTime()).toBe(new Date(g.upcoming.startAt).getTime() - 3 * H);
  });

  it('rejects a minimum above the maximum', async () => {
    const org = await makeUser();
    const res = await api().post('/api/groups').set(org.auth).send(groupPayload({ minPlayers: 9, maxParticipants: 4 }));
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('minPlayers');
  });

  it('is reachable by invite code; link-only groups stay hidden by id', async () => {
    const org = await makeUser();
    const g = await createGroup(org, { visibility: 'unlisted' });
    const guest = await api().get(`/api/groups/${g.inviteCode}`);
    expect(guest.status).toBe(200);
    expect(guest.body.group.inviteCode).toBe(g.inviteCode);
    expect(guest.body.group.members).toBeUndefined();
    expect((await api().get(`/api/groups/${g._id}`)).status).toBe(404);
  });

  it('joins via the link, answers, and shows the roster only to members', async () => {
    const org = await makeUser();
    const p = await makeUser({ name: 'Paul Spieler' });
    const outsider = await makeUser();
    const g = await createGroup(org);

    const joined = await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    expect(joined.body.group.isMember).toBe(true);
    expect(joined.body.group.upcoming.counts.noAnswer).toBe(1);

    const ans = await api().post(`/api/events/${g.upcoming._id}/answer`).set(p.auth).send({ answer: 'in' });
    expect(ans.status).toBe(200);
    expect(ans.body.event.myAnswer).toBe('in');
    expect(ans.body.event.counts.in).toBe(2);
    expect(ans.body.event.participants.map((x) => x.displayName)).toContain('Paul S.');

    const view = await api().get(`/api/events/${g.upcoming._id}`).set(outsider.auth);
    expect(view.body.event.counts.in).toBe(2);
    expect(view.body.event.roster).toBeUndefined();
    expect(view.body.event.participants).toBeUndefined();

    const out = await api().post(`/api/events/${g.upcoming._id}/answer`).set(p.auth).send({ answer: 'out' });
    expect(out.body.event.myAnswer).toBe('out');
    expect(out.body.event.roster.out.map((x) => x.displayName)).toEqual(['Paul S.']);
  });

  it('puts answers beyond capacity on the waiting list and promotes on a no', async () => {
    const org = await makeUser();
    const g = await createGroup(org, { maxParticipants: 2, minPlayers: 2 });
    const [a, b] = await makeUsersFast(2);
    await api().post(`/api/events/${g.upcoming._id}/answer`).set(a.auth).send({ answer: 'in' }).expect(200);
    const waiting = await api().post(`/api/events/${g.upcoming._id}/answer`).set(b.auth).send({ answer: 'in' });
    expect(waiting.body.event.myAnswer).toBe('waiting');
    expect(waiting.body.event.waitlistPosition).toBe(1);

    await api().post(`/api/events/${g.upcoming._id}/answer`).set(a.auth).send({ answer: 'out' }).expect(200);
    const stored = await ConnectEvent.findById(g.upcoming._id).lean();
    expect(stored.participants.map(String)).toContain(String(b.user._id));
    expect(stored.waitlist).toHaveLength(0);
    const promoted = await Notification.findOne({ user: b.user._id, type: 'promoted' });
    expect(promoted).toBeTruthy();
  });

  it('auto-in groups plan every member and new members right away', async () => {
    const org = await makeUser();
    const g = await createGroup(org, { rsvpMode: 'autoIn' });
    const p = await makeUser();
    const joined = await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    expect(joined.body.group.upcoming.counts.in).toBe(2);
  });
});

describe('the weekly loop (jobs)', () => {
  it('invites once, nudges only non-responders, decides at the deadline and reminds', async () => {
    const org = await makeUser();
    const g = await createGroup(org);
    const [a, b, c] = await makeUsersFast(3);
    for (const u of [a, b, c]) await api().post(`/api/groups/${g._id}/join`).set(u.auth).expect(200);
    const ev = await ConnectEvent.findById(g.upcoming._id).lean();

    // Invite: three members, one email each, then nothing on the next run.
    await runJobs(new Date());
    expect(outbox.filter((m) => m.subject.includes('Bist du dabei'))).toHaveLength(3);
    expect(outbox[0].html).toContain('/antwort/');
    await runJobs(new Date());
    expect(outbox.filter((m) => m.subject.includes('Bist du dabei'))).toHaveLength(3);

    // a says yes; the nudge goes only to b and c.
    await api().post(`/api/events/${ev._id}/answer`).set(a.auth).send({ answer: 'in' }).expect(200);
    await runJobs(new Date(ev.deadlineAt.getTime() - 2 * H));
    const nudges = await Notification.find({ type: 'nudge' }).lean();
    expect(nudges.map((n) => String(n.user)).sort()).toEqual([String(b.user._id), String(c.user._id)].sort());

    // Deadline with 2 of min 3 → called off, everyone in is told.
    await runJobs(new Date(ev.deadlineAt.getTime() + 60 * 1000));
    const decided = await ConnectEvent.findById(ev._id).lean();
    expect(decided.decision).toBe('off');
    expect(decided.status).toBe('cancelled');
    expect(await Notification.countDocuments({ type: 'decision_off' })).toBe(2);
  });

  it('confirms a game that reaches the minimum and reminds 2 hours before', async () => {
    const org = await makeUser();
    const g = await createGroup(org);
    const [a, b] = await makeUsersFast(2);
    for (const u of [a, b]) {
      await api().post(`/api/groups/${g._id}/join`).set(u.auth).expect(200);
      await api().post(`/api/events/${g.upcoming._id}/answer`).set(u.auth).send({ answer: 'in' }).expect(200);
    }
    const ev = await ConnectEvent.findById(g.upcoming._id).lean();
    await runJobs(new Date(ev.deadlineAt.getTime() + 1000));
    expect((await ConnectEvent.findById(ev._id).lean()).decision).toBe('on');
    expect(await Notification.countDocuments({ type: 'decision_on' })).toBe(3);

    await runJobs(new Date(ev.startAt.getTime() - 90 * 60 * 1000));
    await runJobs(new Date(ev.startAt.getTime() - 80 * 60 * 1000));
    expect(await Notification.countDocuments({ type: 'reminder' })).toBe(3);
  });

  it('opens next week only inside the invite window', async () => {
    const org = await makeUser();
    const g = await createGroup(org);
    const ev = await ConnectEvent.findById(g.upcoming._id).lean();
    expect((await runJobs(new Date(ev.endAt.getTime() + 60 * 1000))).generated).toBe(0);
    const nextStart = ev.startAt.getTime() + 7 * D;
    expect((await runJobs(new Date(nextStart - 4 * D))).generated).toBe(1);
    expect(await ConnectEvent.countDocuments({ group: g._id })).toBe(2);
    // Running again never duplicates.
    await runJobs(new Date(nextStart - 4 * D + 1000));
    expect(await ConnectEvent.countDocuments({ group: g._id })).toBe(2);
  });

  it('warns hosts once about severe weather', async () => {
    setWeatherFetcher(async () => ({ code: 95, tempC: 18, precipMm: 6, windKmh: 30, severe: true, summary: 'Gewitter, 18 °C' }));
    const org = await makeUser();
    const g = await createGroup(org);
    const ev = await ConnectEvent.findById(g.upcoming._id).lean();
    const now = new Date(ev.startAt.getTime() - 24 * H);
    await runJobs(now);
    await runJobs(new Date(now.getTime() + 4 * H));
    expect(await Notification.countDocuments({ type: 'weather', user: org.user._id })).toBe(1);
    const view = await api().get(`/api/events/${ev._id}`);
    expect(view.body.event.weather).toMatchObject({ severe: true, summary: 'Gewitter, 18 °C' });
  });

  it('protects the job endpoint with a secret', async () => {
    delete process.env.JOB_SECRET;
    expect((await api().post('/api/jobs/run')).status).toBe(503);
    process.env.JOB_SECRET = 'job-secret-for-tests';
    expect((await api().post('/api/jobs/run').set('x-job-secret', 'nope')).status).toBe(401);
    const ok = await api().post('/api/jobs/run').set('x-job-secret', 'job-secret-for-tests');
    expect(ok.status).toBe(200);
    expect(ok.body).toHaveProperty('decided');
  });
});

describe('host tools', () => {
  it('skips this week and tells the people who said yes', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    await api().post(`/api/events/${g.upcoming._id}/answer`).set(p.auth).send({ answer: 'in' });
    const res = await api().post(`/api/groups/${g._id}/skip`).set(org.auth);
    expect(res.status).toBe(200);
    expect(res.body.group.upcoming.status).toBe('cancelled');
    expect(await Notification.countDocuments({ user: p.user._id, type: 'decision_off' })).toBe(1);
    expect((await Group.findById(g._id)).skipDates).toHaveLength(1);
  });

  it('lets only hosts remind, at most every 6 hours', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    expect((await api().post(`/api/groups/${g._id}/remind`).set(p.auth)).status).toBe(403);
    const first = await api().post(`/api/groups/${g._id}/remind`).set(org.auth);
    expect(first.body.reminded).toBe(1);
    expect((await api().post(`/api/groups/${g._id}/remind`).set(org.auth)).status).toBe(409);
  });

  it('calls a game early and lets co-hosts do the same', async () => {
    const org = await makeUser();
    const co = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(co.auth);
    expect((await api().post(`/api/events/${g.upcoming._id}/decide`).set(co.auth).send({ decision: 'on' })).status).toBe(403);
    await api().post(`/api/groups/${g._id}/cohosts`).set(org.auth).send({ userId: String(co.user._id), add: true }).expect(200);
    const res = await api().post(`/api/events/${g.upcoming._id}/decide`).set(co.auth).send({ decision: 'off', reason: 'Gewitter' });
    expect(res.status).toBe(200);
    expect(res.body.event.decision).toBe('off');
    expect(res.body.event.cancelledReason).toBe('Gewitter');
  });

  it('mutes email for one Stammspiel but still delivers cancellations', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    await api().post(`/api/groups/${g._id}/mute`).set(p.auth).send({ muted: true }).expect(200);
    await runJobs(new Date());
    expect(outbox.filter((m) => m.to === p.user.email)).toHaveLength(0);
    expect(await Notification.countDocuments({ user: p.user._id, type: 'invite' })).toBe(1);
  });
});

describe('one-tap email links', () => {
  it('answers without signing in and rejects tampered or expired links', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    const exp = Date.now() + D;
    const token = signLink({ t: 'answer', u: String(p.user._id), e: g.upcoming._id, a: 'in', exp });

    const res = await api().post('/api/links/answer').send({ token });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('in');
    expect((await ConnectEvent.findById(g.upcoming._id)).participants.map(String)).toContain(String(p.user._id));

    const undo = await api().post('/api/links/answer').send({ token, answer: 'out' });
    expect(undo.body.answer).toBe('out');

    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    expect((await api().post('/api/links/answer').send({ token: tampered })).status).toBe(410);
    expect(verifyLink(signLink({ t: 'answer', u: 'x', e: 'y', a: 'in', exp: Date.now() - 1 }))).toBeNull();
  });

  it('mutes from the email footer', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    const token = signLink({ t: 'mute', u: String(p.user._id), g: g._id, exp: Date.now() + D });
    const res = await api().post('/api/links/mute').send({ token, muted: true });
    expect(res.body.muted).toBe(true);
    const stored = await Group.findById(g._id).lean();
    expect(stored.members.find((m) => String(m.user) === String(p.user._id)).muted).toBe(true);
  });
});

describe('single events: waiting list and change notices', () => {
  it('queues on a full event and moves the first person up when someone leaves', async () => {
    const org = await makeUser();
    const [a, b, c] = await makeUsersFast(3);
    const ev = await insertEvent(org.user, { maxParticipants: 2 });
    await api().post(`/api/events/${ev._id}/join`).set(a.auth).expect(200);
    expect((await api().post(`/api/events/${ev._id}/join`).set(b.auth)).status).toBe(409);
    const queued = await api().post(`/api/events/${ev._id}/waitlist`).set(b.auth);
    expect(queued.body.event.waitlistPosition).toBe(1);
    await api().post(`/api/events/${ev._id}/waitlist`).set(c.auth);

    const left = await api().post(`/api/events/${ev._id}/leave`).set(a.auth);
    expect(left.status).toBe(200);
    const stored = await ConnectEvent.findById(ev._id).lean();
    expect(stored.participants.map(String)).toEqual([String(org.user._id), String(b.user._id)]);
    expect(stored.waitlist.map(String)).toEqual([String(c.user._id)]);
    expect(await Notification.countDocuments({ user: b.user._id, type: 'promoted' })).toBe(1);

    // Leaving the waiting list is just as easy.
    await api().post(`/api/events/${ev._id}/leave`).set(c.auth).expect(200);
    expect((await ConnectEvent.findById(ev._id).lean()).waitlist).toHaveLength(0);
  });

  it('tells participants when time or place changes, and when it is cancelled', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const ev = await insertEvent(org.user);
    await api().post(`/api/events/${ev._id}/join`).set(p.auth);
    const later = new Date(ev.startAt.getTime() + H);
    await api().patch(`/api/events/${ev._id}`).set(org.auth).send({ startAt: later, endAt: new Date(later.getTime() + 2 * H) }).expect(200);
    expect(await Notification.countDocuments({ user: p.user._id, type: 'changed' })).toBe(1);
    expect(await Notification.countDocuments({ user: org.user._id })).toBe(0);
    await api().post(`/api/events/${ev._id}/cancel`).set(org.auth).send({ reason: 'Platz gesperrt' }).expect(200);
    expect(await Notification.countDocuments({ user: p.user._id, type: 'cancelled' })).toBe(1);
  });
});

describe('notifications, no-shows and reliability', () => {
  it('lists, counts and marks notices as read', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const g = await createGroup(org);
    await api().post(`/api/groups/${g._id}/join`).set(p.auth);
    await runJobs(new Date());
    const list = await api().get('/api/notifications').set(p.auth);
    expect(list.body.unread).toBe(1);
    expect(list.body.notifications[0].link).toBe(`/events/${g.upcoming._id}`);
    const read = await api().post('/api/notifications/read').set(p.auth).send({});
    expect(read.body.unread).toBe(0);
  });

  it('marks no-shows within 24 h, allows a dispute, and counts reliability from facts', async () => {
    const org = await makeUser();
    const p = await makeUser();
    const ended = [];
    for (let i = 1; i <= 3; i += 1) {
      ended.push(
        await insertEvent(org.user, {
          startAt: new Date(Date.now() - i * D - 3 * H),
          endAt: new Date(Date.now() - (i === 1 ? 2 * H : i * D)),
          participants: [org.user._id, p.user._id],
        })
      );
    }
    // Only the game that ended 2 hours ago is still in the window.
    expect((await api().put(`/api/events/${ended[1]._id}/no-shows`).set(org.auth).send({ userIds: [String(p.user._id)] })).status).toBe(409);
    expect((await api().put(`/api/events/${ended[0]._id}/no-shows`).set(p.auth).send({ userIds: [] })).status).toBe(403);
    const marked = await api().put(`/api/events/${ended[0]._id}/no-shows`).set(org.auth).send({ userIds: [String(p.user._id)] });
    expect(marked.body.event.noShows).toEqual([{ _id: String(p.user._id), disputed: false }]);

    const profile = await api().get(`/api/users/${p.user._id}/profile`);
    expect(profile.body.profile.reliability).toMatchObject({ games: 3, attended: 2, noShows: 1 });

    const dispute = await api().post(`/api/events/${ended[0]._id}/dispute`).set(p.auth).send({ note: 'War da!' });
    expect(dispute.body.event.myNoShow.disputed).toBe(true);
    const after = await api().get(`/api/users/${p.user._id}/profile`);
    expect(after.body.profile.reliability).toMatchObject({ games: 3, attended: 3, noShows: 0 });
  });

  it('hides reliability from others until 3 games', async () => {
    const p = await makeUser();
    const other = await makeUser();
    expect((await api().get(`/api/users/${p.user._id}/profile`).set(other.auth)).body.profile.reliability).toBeNull();
    expect((await api().get(`/api/users/${p.user._id}/profile`).set(p.auth)).body.profile.reliability).toMatchObject({ games: 0 });
  });

  it('gives admins the pilot metrics', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    expect((await api().get('/api/admin/metrics').set(user.auth)).status).toBe(403);
    const res = await api().get('/api/admin/metrics').set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('last28Days.games');
  });
});
