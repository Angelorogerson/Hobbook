import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { api, makeUser, insertEvent, hoursFromNow } from './helpers.js';
import { User, ConnectEvent, Group, Notification, Report, Comment, Feedback } from '../models/index.js';
import { escapeText, foldLine, formatUtc, buildCalendar } from '../services/ics.js';
import { cityKey } from '../utils/text.js';

const feedPath = (token) => `/api/calendar/feed/${token}.ics`;

async function linkToken(auth) {
  const res = await api().get('/api/calendar/link').set(auth);
  expect(res.status).toBe(200);
  return res.body.token;
}

/** Undo line folding and split into content lines. */
const unfold = (ics) => ics.replace(/\r\n[ \t]/g, '').split('\r\n');

/** The content lines of each VEVENT, keyed by UID. */
function eventsByUid(ics) {
  const out = {};
  let current = null;
  for (const line of unfold(ics)) {
    if (line === 'BEGIN:VEVENT') current = [];
    else if (line === 'END:VEVENT') {
      const uid = current.find((l) => l.startsWith('UID:')).slice(4);
      out[uid] = current;
      current = null;
    } else if (current) current.push(line);
  }
  return out;
}

describe('ics serializer', () => {
  it('escapes backslash, semicolon, comma and line breaks', () => {
    expect(escapeText('a\\b')).toBe('a\\\\b');
    expect(escapeText('Halle 3; Eingang B, links')).toBe('Halle 3\\; Eingang B\\, links');
    expect(escapeText('Zeile 1\nZeile 2\r\nZeile 3\rZeile 4')).toBe('Zeile 1\\nZeile 2\\nZeile 3\\nZeile 4');
    expect(escapeText('C:\\temp\nx')).toBe('C:\\\\temp\\nx');
    expect(escapeText(null)).toBe('');
  });

  it('leaves short lines alone and folds long ones at 75 octets', () => {
    expect(foldLine('SUMMARY:Kurz')).toBe('SUMMARY:Kurz');
    const exact = `SUMMARY:${'x'.repeat(67)}`;
    expect(Buffer.byteLength(exact)).toBe(75);
    expect(foldLine(exact)).toBe(exact);

    const long = `DESCRIPTION:${'abcdefghij'.repeat(30)}`;
    const folded = foldLine(long);
    const physical = folded.split('\r\n');
    expect(physical.length).toBeGreaterThan(1);
    for (const line of physical) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    for (const line of physical.slice(1)) expect(line.startsWith(' ')).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(long);
  });

  it('never splits a multi-byte character when folding', () => {
    const long = `SUMMARY:${'Fußball für Läufer 🏀 – Größe '.repeat(12)}`;
    const folded = foldLine(long);
    for (const line of folded.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
      expect(line).not.toContain('\uFFFD');
      // A cut inside a surrogate pair would leave a lone half behind.
      expect(Buffer.from(line, 'utf8').toString('utf8')).toBe(line);
    }
    expect(folded.replace(/\r\n /g, '')).toBe(long);
  });

  it('formats dates in UTC', () => {
    expect(formatUtc('2026-03-29T01:30:00+02:00')).toBe('20260328T233000Z');
    expect(() => formatUtc('nonsense')).toThrow();
  });

  it('builds a calendar with CRLF line ends and the required header', () => {
    const now = new Date('2026-05-01T10:00:00Z');
    const ics = buildCalendar({
      now,
      entries: [
        {
          uid: 'abc@hobbook',
          start: '2026-05-02T16:00:00Z',
          end: '2026-05-02T18:00:00Z',
          summary: 'Kick, locker; ohne Stress',
          location: 'Volkspark, Volkspark 1',
          description: 'Sportart: Fußball\nMitbringen: Wasser',
          url: 'https://hobbook.example/events/abc',
          geo: { lat: 52.53, lng: 13.38 },
          status: 'CANCELLED',
          sequence: 4,
        },
      ],
    });
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    const lines = unfold(ics);
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('CALSCALE:GREGORIAN');
    expect(lines).toContain('X-WR-CALNAME:Hobbook');
    expect(lines.some((l) => l.startsWith('PRODID:'))).toBe(true);
    expect(lines).toContain('UID:abc@hobbook');
    expect(lines).toContain('DTSTAMP:20260501T100000Z');
    expect(lines).toContain('DTSTART:20260502T160000Z');
    expect(lines).toContain('DTEND:20260502T180000Z');
    expect(lines).toContain('SUMMARY:Kick\\, locker\\; ohne Stress');
    expect(lines).toContain('LOCATION:Volkspark\\, Volkspark 1');
    expect(lines).toContain('DESCRIPTION:Sportart: Fußball\\nMitbringen: Wasser');
    expect(lines).toContain('GEO:52.53;13.38');
    expect(lines).toContain('URL:https://hobbook.example/events/abc');
    expect(lines).toContain('STATUS:CANCELLED');
    expect(lines).toContain('LAST-MODIFIED:20260501T100000Z');
    expect(lines).toContain('SEQUENCE:4');
  });
});

describe('calendar link', () => {
  it('requires login', async () => {
    expect((await api().get('/api/calendar/link')).status).toBe(401);
    expect((await api().post('/api/calendar/link/reset')).status).toBe(401);
  });

  it('is stable across calls, changes on reset, and the old address stops working', async () => {
    const { user, auth } = await makeUser();
    const first = await linkToken(auth);
    expect(first).toMatch(new RegExp(`^${user._id}-[A-Za-z0-9_-]{32,}$`));
    expect(await linkToken(auth)).toBe(first);
    expect((await api().get(feedPath(first))).status).toBe(200);

    const reset = await api().post('/api/calendar/link/reset').set(auth);
    expect(reset.status).toBe(200);
    expect(reset.body.token).not.toBe(first);
    expect(reset.body.token.startsWith(`${user._id}-`)).toBe(true);
    expect(await linkToken(auth)).toBe(reset.body.token);

    expect((await api().get(feedPath(first))).status).toBe(404);
    expect((await api().get(feedPath(reset.body.token))).status).toBe(200);
  });

  it('never returns the key with the normal user data', async () => {
    const { user, auth } = await makeUser();
    await linkToken(auth);
    const stored = await User.findById(user._id).lean();
    expect(stored.calendarKey).toBeUndefined();
    const me = await api().put('/api/users/me').set(auth).send({ city: 'Berlin' });
    expect(JSON.stringify(me.body)).not.toContain('calendarKey');
  });
});

describe('calendar feed', () => {
  it('lists joined and organized events, marks cancelled ones and leaves out other people', async () => {
    const me = await makeUser({ name: 'Paula Neumann' });
    const other = await makeUser({ name: 'Zacharias Quittenbaum', email: 'zacharias.q@hobbook.test' });

    const organized = await insertEvent(me.user, { title: 'Mein Kick; Runde 1, locker', bring: 'Hallenschuhe, Wasser' });
    const joined = await insertEvent(other.user, {
      title: 'Lauftreff am See',
      sport: 'running',
      participants: [other.user._id, me.user._id],
      location: { placeName: 'Seeufer', address: 'Uferweg 3', city: 'Berlin' },
    });
    const cancelled = await insertEvent(other.user, {
      title: 'Volleyball',
      sport: 'volleyball',
      participants: [other.user._id, me.user._id],
      status: 'cancelled',
      cancelledAt: new Date(),
    });
    const recent = await insertEvent(me.user, { title: 'Letzte Woche', startAt: hoursFromNow(-7 * 24), endAt: hoursFromNow(-7 * 24 + 2) });
    const old = await insertEvent(me.user, { title: 'Lange her', startAt: hoursFromNow(-40 * 24), endAt: hoursFromNow(-40 * 24 + 2) });
    const foreign = await insertEvent(other.user, { title: 'Nicht mein Spiel' });
    // On the waiting list only: not a game the person takes part in.
    const waiting = await insertEvent(other.user, { title: 'Nur Warteliste', waitlist: [me.user._id] });

    const res = await api().get(feedPath(await linkToken(me.auth)));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/calendar; charset=utf-8');
    expect(res.headers['cache-control']).toBe('private, max-age=900');

    const ics = res.text;
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    for (const line of ics.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    const lines = unfold(ics);
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('CALSCALE:GREGORIAN');
    expect(lines).toContain('X-WR-CALNAME:Hobbook');
    expect(lines.filter((l) => l === 'BEGIN:VEVENT').length).toBe(lines.filter((l) => l === 'END:VEVENT').length);

    const events = eventsByUid(ics);
    expect(Object.keys(events).sort()).toEqual([organized, joined, cancelled, recent].map((e) => `${e._id}@hobbook`).sort());
    expect(events[`${old._id}@hobbook`]).toBeUndefined();
    expect(events[`${foreign._id}@hobbook`]).toBeUndefined();
    expect(events[`${waiting._id}@hobbook`]).toBeUndefined();

    const mine = events[`${organized._id}@hobbook`];
    expect(mine).toContain('SUMMARY:Mein Kick\\; Runde 1\\, locker');
    expect(mine).toContain('LOCATION:Volkspark\\, Volkspark 1');
    expect(mine).toContain('GEO:52.53;13.38');
    expect(mine).toContain('STATUS:CONFIRMED');
    expect(mine).toContain(`URL:http://localhost:5173/events/${organized._id}`);
    expect(mine).toContain(`DTSTART:${formatUtc(organized.startAt)}`);
    expect(mine).toContain(`DTEND:${formatUtc(organized.endAt)}`);
    expect(mine).toContain('SEQUENCE:0');
    expect(mine.some((l) => /^DTSTAMP:\d{8}T\d{6}Z$/.test(l))).toBe(true);
    expect(mine.some((l) => /^LAST-MODIFIED:\d{8}T\d{6}Z$/.test(l))).toBe(true);
    const description = mine.find((l) => l.startsWith('DESCRIPTION:'));
    expect(description).toContain('Sportart: Fußball');
    expect(description).toContain('Mitbringen: Hallenschuhe\\, Wasser');
    expect(description).toContain(`/events/${organized._id}`);

    const other1 = events[`${joined._id}@hobbook`];
    expect(other1).toContain('SUMMARY:Lauftreff am See');
    expect(other1.some((l) => l.startsWith('GEO:'))).toBe(false);

    const off = events[`${cancelled._id}@hobbook`];
    expect(off).toContain('STATUS:CANCELLED');
    expect(off.find((l) => l.startsWith('SEQUENCE:'))).not.toBe('SEQUENCE:0');

    // No names or addresses of people, not even the subscriber's own.
    for (const secret of ['Zacharias', 'Quittenbaum', 'zacharias.q', 'Paula', 'Neumann', me.user.email]) {
      expect(ics).not.toContain(secret);
    }
  });

  it('answers 404 without details for malformed, unknown and wrong tokens', async () => {
    const { user, auth } = await makeUser();
    const token = await linkToken(auth);
    const key = token.slice(String(user._id).length + 1);
    const unknownId = new mongoose.Types.ObjectId().toString();
    const noKeyUser = await makeUser();

    const bad = [
      'abc',
      `${user._id}`,
      `${user._id}-`,
      `${user._id}-short`,
      `${user._id}-${'A'.repeat(key.length)}`,
      `${user._id}-${key}x`,
      `${user._id}-${key.slice(0, -1)}`,
      `${unknownId}-${key}`,
      `${noKeyUser.user._id}-${key}`,
      `${noKeyUser.user._id}-undefined`,
      `zzzzzzzzzzzzzzzzzzzzzzzz-${key}`,
      `${user._id}-${key}/../x`,
      '%00',
    ];
    for (const t of bad) {
      const res = await api().get(feedPath(t));
      expect(res.status, t).toBe(404);
      expect(res.text).not.toContain('BEGIN:VCALENDAR');
    }
    // The right token, but not as an .ics address.
    expect((await api().get(`/api/calendar/feed/${token}`)).status).toBe(404);
    expect((await api().get(`/api/calendar/feed/${token}.json`)).status).toBe(404);
    expect((await api().get(feedPath(token))).status).toBe(200);
  });

  it('answers 404 for a blocked account', async () => {
    const { user, auth } = await makeUser();
    const token = await linkToken(auth);
    await User.updateOne({ _id: user._id }, { $set: { isActive: false } });
    expect((await api().get(feedPath(token))).status).toBe(404);
  });

  it('returns an empty calendar when there are no games', async () => {
    const { auth } = await makeUser();
    const res = await api().get(feedPath(await linkToken(auth)));
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('BEGIN:VEVENT');
    expect(res.text).toContain('END:VCALENDAR');
  });
});

describe('data export', () => {
  it('requires login', async () => {
    expect((await api().get('/api/users/me/export')).status).toBe(401);
  });

  it("contains the person's own data and nothing private about anyone else", async () => {
    const me = await makeUser({ name: 'Paula Neumann', email: 'paula.neumann@hobbook.test' });
    const other = await makeUser({ name: 'Zacharias Quittenbaum', email: 'zacharias.q@hobbook.test' });
    const uid = me.user._id;
    const oid = other.user._id;

    await api().get('/api/calendar/link').set(me.auth);
    const saved = await insertEvent(other.user, { title: 'Gemerktes Spiel' });
    await User.updateOne(
      { _id: uid },
      {
        $set: {
          city: 'Berlin',
          sports: ['football'],
          savedEvents: [saved._id],
          alerts: [{ city: 'Berlin', cityKey: cityKey('Berlin'), sport: 'football' }],
          pushSubscriptions: [{ endpoint: 'https://push.example/secret-endpoint', keys: { p256dh: 'p256-secret', auth: 'auth-secret' } }],
          passwordResetTokenHash: 'reset-hash-secret',
          emailVerifyTokenHash: 'verify-hash-secret',
        },
      }
    );

    const organized = await insertEvent(me.user, { title: 'Mein Kick', participants: [uid, oid] });
    const joined = await insertEvent(other.user, {
      title: 'Lauftreff',
      sport: 'running',
      participants: [oid, uid],
      responses: [
        { user: uid, answer: 'in', at: new Date() },
        { user: oid, answer: 'out', at: new Date() },
      ],
    });
    const past = await insertEvent(other.user, {
      title: 'Verpasst',
      startAt: hoursFromNow(-30),
      endAt: hoursFromNow(-28),
      participants: [oid, uid],
      noShows: [
        { user: uid, markedAt: new Date(), disputed: true, disputeNote: 'Ich war da, nur spät.' },
        { user: oid, markedAt: new Date(), disputed: true, disputeNote: 'Fremde Notiz' },
      ],
    });
    const waiting = await insertEvent(other.user, { title: 'Volles Spiel', waitlist: [oid, uid] });
    await insertEvent(other.user, { title: 'Fremdes Spiel' });

    const location = { placeName: 'Uni-Platz', address: 'Weg 1', city: 'Kaiserslautern', cityKey: cityKey('Kaiserslautern') };
    const groupBase = { sport: 'basketball', location, weekday: 2, startTime: '19:00', durationMin: 120, maxParticipants: 8, minPlayers: 4 };
    await Group.create({
      ...groupBase,
      name: 'Dienstagsrunde',
      organizer: oid,
      inviteCode: 'AAAA1111',
      members: [
        { user: oid, joinedAt: new Date('2026-01-01T10:00:00Z') },
        { user: uid, joinedAt: new Date('2026-02-02T10:00:00Z'), muted: true },
      ],
    });
    await Group.create({ ...groupBase, name: 'Meine Runde', organizer: uid, inviteCode: 'BBBB2222', members: [{ user: uid }] });
    await Group.create({ ...groupBase, name: 'Fremde Runde', organizer: oid, inviteCode: 'CCCC3333', members: [{ user: oid }] });

    await Notification.create({ user: uid, type: 'reminder', title: 'Gleich geht es los', body: 'In 2 Stunden', readAt: new Date() });
    await Notification.create({ user: oid, type: 'reminder', title: 'Fremde Nachricht', body: 'nicht für mich' });
    await Report.create({ reporter: uid, targetUser: oid, reason: 'spam', text: 'Schickt Werbung', status: 'resolved', note: 'Moderationsnotiz geheim', resolvedBy: oid });
    await Report.create({ reporter: oid, event: organized._id, reason: 'other', text: 'Fremde Meldung' });
    await Comment.create({ event: joined._id, author: uid, text: 'Gibt es Parkplätze?' });
    await Comment.create({ event: joined._id, author: oid, text: 'Fremder Kommentar' });
    await Feedback.create({ user: uid, kind: 'idea', text: 'Bitte mehr Sportarten', page: '/profil' });
    await Feedback.create({ user: oid, kind: 'problem', text: 'Fremdes Feedback' });

    const res = await api().get('/api/users/me/export').set(me.auth);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="hobbook-daten-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(res.headers['cache-control']).toBe('no-store');

    const data = res.body;
    expect(new Date(data.exportedAt).getTime()).toBeGreaterThan(Date.now() - 60000);
    expect(typeof data.hinweis).toBe('string');
    expect(data.hinweis.length).toBeGreaterThan(20);

    expect(data.account).toMatchObject({
      name: 'Paula Neumann',
      email: 'paula.neumann@hobbook.test',
      city: 'Berlin',
      sports: ['football'],
      role: 'user',
      emailNotifications: true,
      emailVerifiedAt: null,
      pushSubscriptionCount: 1,
    });
    expect(data.account.createdAt).toBeTruthy();
    expect(data.account.alerts).toHaveLength(1);
    expect(data.account.alerts[0]).toMatchObject({ city: 'Berlin', sport: 'football' });

    expect(data.eventsOrganized).toHaveLength(1);
    expect(data.eventsOrganized[0]).toMatchObject({
      id: String(organized._id),
      title: 'Mein Kick',
      sport: 'football',
      placeName: 'Volkspark',
      city: 'Berlin',
      status: 'open',
    });
    expect(data.eventsOrganized[0].startAt).toBe(organized.startAt.toISOString());
    expect(data.eventsOrganized[0].endAt).toBe(organized.endAt.toISOString());
    expect(data.eventsJoined.map((e) => e.title).sort()).toEqual(['Lauftreff', 'Verpasst']);
    expect(data.eventsJoined.find((e) => e.title === 'Verpasst').status).toBe('completed');

    expect(data.waitlist).toHaveLength(1);
    expect(data.waitlist[0]).toMatchObject({ id: String(waiting._id), title: 'Volles Spiel', position: 2 });
    expect(data.savedEvents).toEqual([{ id: String(saved._id), title: 'Gemerktes Spiel' }]);

    expect(data.stammspiele).toHaveLength(2);
    const member = data.stammspiele.find((g) => g.name === 'Dienstagsrunde');
    expect(member).toMatchObject({ role: 'member', muted: true, joinedAt: '2026-02-02T10:00:00.000Z' });
    expect(data.stammspiele.find((g) => g.name === 'Meine Runde')).toMatchObject({ role: 'organizer', muted: false });

    expect(data.answers).toHaveLength(1);
    expect(data.answers[0]).toMatchObject({ eventId: String(joined._id), answer: 'in', late: false });
    expect(data.noShows).toHaveLength(1);
    expect(data.noShows[0]).toMatchObject({ eventId: String(past._id), disputed: true, disputeNote: 'Ich war da, nur spät.' });

    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0]).toMatchObject({ type: 'reminder', title: 'Gleich geht es los', body: 'In 2 Stunden' });
    expect(data.notifications[0].readAt).toBeTruthy();
    expect(data.reports).toHaveLength(1);
    expect(data.reports[0]).toMatchObject({ about: 'person', reason: 'spam', text: 'Schickt Werbung', status: 'resolved' });
    expect(data.reports[0].createdAt).toBeTruthy();
    expect(data.comments).toHaveLength(1);
    expect(data.comments[0]).toMatchObject({ eventId: String(joined._id), text: 'Gibt es Parkplätze?' });
    expect(data.feedback).toHaveLength(1);
    expect(data.feedback[0]).toMatchObject({ kind: 'idea', text: 'Bitte mehr Sportarten' });

    const raw = res.text;
    const stored = await User.findById(uid).select('+password +calendarKey').lean();
    expect(stored.calendarKey).toBeTruthy();
    const forbidden = [
      // other people
      'Zacharias',
      'Quittenbaum',
      'zacharias.q',
      String(oid),
      'Fremde',
      'nicht für mich',
      // secrets and internal fields
      stored.password,
      stored.calendarKey,
      'password',
      'calendarKey',
      'TokenHash',
      'secret',
      'p256dh',
      'endpoint',
      'Moderationsnotiz',
      'resolvedBy',
      'inviteCode',
      'AAAA1111',
    ];
    for (const text of forbidden) expect(raw, text).not.toContain(text);
  });

  it('works for a new account with no activity', async () => {
    const { auth } = await makeUser();
    const res = await api().get('/api/users/me/export').set(auth);
    expect(res.status).toBe(200);
    for (const key of ['eventsOrganized', 'eventsJoined', 'waitlist', 'savedEvents', 'stammspiele', 'answers', 'noShows', 'notifications', 'reports', 'comments', 'feedback']) {
      expect(res.body[key], key).toEqual([]);
    }
    expect(res.body.account.pushSubscriptionCount).toBe(0);
    expect(await ConnectEvent.countDocuments()).toBe(0);
  });
});
