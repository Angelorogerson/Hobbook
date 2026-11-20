import { describe, it, expect, beforeEach } from 'vitest';
import { api, makeUser, insertEvent, hoursFromNow } from './helpers.js';
import { Comment, Group, Notification } from '../models/index.js';
import { outbox } from '../services/mailer.js';

const url = (event) => `/api/events/${event._id}/comments`;
const post = (event, who, body) => api().post(url(event)).set(who.auth).send(body);
const noticesFor = (who, type) => Notification.find({ user: who.user._id, ...(type && { type }) }).lean();

beforeEach(() => {
  outbox.length = 0;
});

describe('Fragen & Infos: reading and writing', () => {
  it('lets guests read but not write', async () => {
    const host = await makeUser({ name: 'Hanna Hostmann' });
    const event = await insertEvent(host.user);
    await post(event, host, { text: 'Bringt Wasser mit' });

    const read = await api().get(url(event));
    expect(read.status).toBe(200);
    expect(read.body.comments).toHaveLength(1);
    expect(read.body.comments[0]).toMatchObject({
      kind: 'comment',
      text: 'Bringt Wasser mit',
      author: { displayName: 'Hanna H.', isHost: true },
      canDelete: false,
    });
    expect(JSON.stringify(read.body)).not.toContain('@hobbook.test');
    expect(JSON.stringify(read.body)).not.toContain('Hostmann');

    const write = await api().post(url(event)).send({ text: 'Hallo' });
    expect(write.status).toBe(401);
    expect(await Comment.countDocuments()).toBe(1);
  });

  it('returns comments oldest first and marks what the viewer may delete', async () => {
    const host = await makeUser();
    const asker = await makeUser({ name: 'Anna Fragerin' });
    const other = await makeUser();
    const event = await insertEvent(host.user);
    await post(event, asker, { text: 'Erste' });
    await post(event, host, { text: 'Zweite' });
    await post(event, other, { text: 'Dritte' });

    const asAsker = await api().get(url(event)).set(asker.auth);
    expect(asAsker.body.comments.map((c) => c.text)).toEqual(['Erste', 'Zweite', 'Dritte']);
    expect(asAsker.body.comments.map((c) => c.canDelete)).toEqual([true, false, false]);
    expect(asAsker.body.comments.map((c) => c.author.isHost)).toEqual([false, true, false]);

    const asHost = await api().get(url(event)).set(host.auth);
    expect(asHost.body.comments.map((c) => c.canDelete)).toEqual([true, true, true]);
  });

  it('strips HTML, keeps line breaks and enforces the length', async () => {
    const host = await makeUser();
    const asker = await makeUser();
    const event = await insertEvent(host.user);

    const ok = await post(event, asker, { text: '  <b>Gibt es</b> <script>alert(1)</script>Parkplätze?\r\nDanke  ' });
    expect(ok.status).toBe(201);
    expect(ok.body.comment.text).toBe('Gibt es alert(1)Parkplätze?\nDanke');
    expect(ok.body.comment).toMatchObject({ kind: 'comment', canDelete: true, author: { isHost: false } });

    const empty = await post(event, asker, { text: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.errors.text).toBeTruthy();

    const onlyTags = await post(event, asker, { text: '<p></p>' });
    expect(onlyTags.status).toBe(400);

    const missing = await post(event, asker, {});
    expect(missing.status).toBe(400);

    const long = await post(event, asker, { text: 'a'.repeat(501) });
    expect(long.status).toBe(400);
    expect(long.body.message).toMatch(/500/);

    const max = await post(event, asker, { text: 'a'.repeat(500) });
    expect(max.status).toBe(201);

    const badKind = await post(event, asker, { text: 'Hallo', kind: 'shout' });
    expect(badKind.status).toBe(400);
  });

  it('stops one person from flooding an event', async () => {
    const host = await makeUser();
    const asker = await makeUser();
    const event = await insertEvent(host.user);
    await Comment.insertMany(Array.from({ length: 20 }, (_, i) => ({ event: event._id, author: asker.user._id, text: `Nr. ${i}` })));

    const res = await post(event, asker, { text: 'Noch eine' });
    expect(res.status).toBe(429);
    expect(res.body.message).toBeTruthy();

    const someoneElse = await makeUser();
    expect((await post(event, someoneElse, { text: 'Ich darf' })).status).toBe(201);
  });

  it('refuses comments when the event ended more than 7 days ago', async () => {
    const host = await makeUser();
    const old = await insertEvent(host.user, { startAt: hoursFromNow(-8 * 24 - 2), endAt: hoursFromNow(-8 * 24) });
    const res = await post(old, host, { text: 'War schön' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/vorbei/);
    expect(await Comment.countDocuments()).toBe(0);

    const recent = await insertEvent(host.user, { startAt: hoursFromNow(-50), endAt: hoursFromNow(-48) });
    expect((await post(recent, host, { text: 'Danke fürs Kommen' })).status).toBe(201);
  });

  it('answers 404 for malformed and unknown ids', async () => {
    const host = await makeUser();
    const event = await insertEvent(host.user);
    const unknown = '64b000000000000000000000';

    expect((await api().get('/api/events/not-an-id/comments')).status).toBe(404);
    expect((await api().post('/api/events/not-an-id/comments').set(host.auth).send({ text: 'x' })).status).toBe(404);
    expect((await api().get(`/api/events/${unknown}/comments`)).status).toBe(404);
    expect((await api().post(`/api/events/${unknown}/comments`).set(host.auth).send({ text: 'x' })).status).toBe(404);
    expect((await api().delete(`${url(event)}/not-an-id`).set(host.auth)).status).toBe(404);
    expect((await api().delete(`${url(event)}/${unknown}`).set(host.auth)).status).toBe(404);
    expect((await api().delete(`/api/events/not-an-id/comments/${unknown}`).set(host.auth)).status).toBe(404);
  });
});

describe('Fragen & Infos: announcements and notices', () => {
  it('lets only hosts announce and tells everyone who is in, except the author', async () => {
    const host = await makeUser();
    const player = await makeUser();
    const waiting = await makeUser();
    const stranger = await makeUser();
    const event = await insertEvent(host.user, {
      title: 'Kick im Park',
      participants: [host.user._id, player.user._id],
      waitlist: [waiting.user._id],
    });

    const refused = await post(event, player, { text: 'Ich sag mal an', kind: 'announcement' });
    expect(refused.status).toBe(403);
    expect(await Comment.countDocuments()).toBe(0);
    expect(await Notification.countDocuments()).toBe(0);

    const long = `Wir spielen heute auf dem hinteren Platz. ${'Bitte pünktlich sein. '.repeat(20)}`.trim();
    const res = await post(event, host, { text: long, kind: 'announcement' });
    expect(res.status).toBe(201);
    expect(res.body.comment).toMatchObject({ kind: 'announcement', author: { isHost: true } });

    for (const who of [player, waiting]) {
      const notices = await noticesFor(who, 'announcement');
      expect(notices).toHaveLength(1);
      expect(notices[0].title).toBe('Nachricht zu „Kick im Park“');
      expect(notices[0].link).toBe(`/events/${event._id}`);
      expect(String(notices[0].event)).toBe(String(event._id));
      expect(notices[0].body.length).toBeLessThanOrEqual(200);
      expect(notices[0].body.startsWith('Wir spielen heute')).toBe(true);
    }
    expect(await noticesFor(host)).toHaveLength(0);
    expect(await noticesFor(stranger)).toHaveLength(0);
    // Announcements also go out by email.
    expect(outbox.map((m) => m.to).sort()).toEqual([player.user.email, waiting.user.email].sort());
  });

  it('lets an admin announce', async () => {
    const host = await makeUser();
    const admin = await makeUser({ role: 'admin' });
    const event = await insertEvent(host.user);
    const res = await post(event, admin, { text: 'Hinweis vom Team', kind: 'announcement' });
    expect(res.status).toBe(201);
    expect(await noticesFor(host, 'announcement')).toHaveLength(1);
  });

  it('tells the organizer about a question and the asker about the answer, without email', async () => {
    const host = await makeUser();
    const asker = await makeUser();
    const second = await makeUser();
    const event = await insertEvent(host.user, { title: 'Kick im Park' });

    await post(event, asker, { text: 'Kann man dort parken?' });
    let hostNotices = await noticesFor(host, 'comment');
    expect(hostNotices).toHaveLength(1);
    expect(hostNotices[0]).toMatchObject({
      title: 'Neue Frage zu „Kick im Park“',
      body: 'Kann man dort parken?',
      link: `/events/${event._id}`,
    });
    expect(await noticesFor(asker)).toHaveLength(0);

    await post(event, second, { text: 'Und gibt es Duschen?' });
    hostNotices = await noticesFor(host, 'comment');
    expect(hostNotices).toHaveLength(2);
    // Other askers are not told about each other's questions.
    expect(await noticesFor(asker)).toHaveLength(0);

    await post(event, host, { text: 'Ja, direkt am Eingang.' });
    for (const who of [asker, second]) {
      const notices = await noticesFor(who, 'comment');
      expect(notices).toHaveLength(1);
      expect(notices[0]).toMatchObject({ title: 'Antwort zu „Kick im Park“', body: 'Ja, direkt am Eingang.' });
    }
    expect(await noticesFor(host, 'comment')).toHaveLength(2);
    expect(outbox).toHaveLength(0);
  });

  it('treats the organizer and co-hosts of a Stammspiel as hosts', async () => {
    const organizer = await makeUser();
    const coHost = await makeUser();
    const member = await makeUser();
    const group = await Group.create({
      name: 'Basketball am Uni-Platz',
      sport: 'basketball',
      location: { placeName: 'Uni-Platz', address: 'Weg 1', city: 'Berlin', cityKey: 'berlin' },
      organizer: organizer.user._id,
      coHosts: [coHost.user._id],
      weekday: 3,
      startTime: '19:00',
      durationMin: 120,
      maxParticipants: 10,
      minPlayers: 4,
      inviteCode: 'abc12345',
      members: [{ user: organizer.user._id }, { user: coHost.user._id }, { user: member.user._id }],
    });
    const event = await insertEvent(organizer.user, {
      title: 'Basketball am Uni-Platz',
      group: group._id,
      participants: [organizer.user._id, member.user._id],
    });

    // A question reaches every host.
    await post(event, member, { text: 'Halle oder draußen?' });
    expect(await noticesFor(organizer, 'comment')).toHaveLength(1);
    expect(await noticesFor(coHost, 'comment')).toHaveLength(1);

    // The co-host may announce; the notice carries the Stammspiel.
    const res = await post(event, coHost, { text: 'Heute in der Halle', kind: 'announcement' });
    expect(res.status).toBe(201);
    expect(res.body.comment.author.isHost).toBe(true);
    const memberNotices = await noticesFor(member, 'announcement');
    expect(memberNotices).toHaveLength(1);
    expect(String(memberNotices[0].group)).toBe(String(group._id));
    expect(await noticesFor(organizer, 'announcement')).toHaveLength(1);
    expect(await noticesFor(coHost, 'announcement')).toHaveLength(0);

    // The co-host may delete other people's messages.
    const list = await api().get(url(event)).set(coHost.auth);
    const question = list.body.comments.find((c) => c.text === 'Halle oder draußen?');
    expect(question.canDelete).toBe(true);
    expect((await api().delete(`${url(event)}/${question._id}`).set(coHost.auth)).status).toBe(200);
  });
});

describe('Fragen & Infos: deleting', () => {
  it('allows the author, a host and an admin, but not a stranger', async () => {
    const host = await makeUser();
    const asker = await makeUser();
    const stranger = await makeUser();
    const admin = await makeUser({ role: 'admin' });
    const event = await insertEvent(host.user);
    const otherEvent = await insertEvent(host.user);

    const ids = [];
    for (const text of ['Eins', 'Zwei', 'Drei']) {
      ids.push((await post(event, asker, { text })).body.comment._id);
    }

    expect((await api().delete(`${url(event)}/${ids[0]}`)).status).toBe(401);
    const refused = await api().delete(`${url(event)}/${ids[0]}`).set(stranger.auth);
    expect(refused.status).toBe(403);
    // A comment is only reachable through its own event.
    expect((await api().delete(`${url(otherEvent)}/${ids[0]}`).set(host.auth)).status).toBe(404);
    expect(await Comment.countDocuments()).toBe(3);

    expect((await api().delete(`${url(event)}/${ids[0]}`).set(asker.auth)).status).toBe(200);
    expect((await api().delete(`${url(event)}/${ids[1]}`).set(host.auth)).status).toBe(200);
    expect((await api().delete(`${url(event)}/${ids[2]}`).set(admin.auth)).status).toBe(200);
    expect(await Comment.countDocuments()).toBe(0);
    expect((await api().delete(`${url(event)}/${ids[0]}`).set(asker.auth)).status).toBe(404);
  });
});
