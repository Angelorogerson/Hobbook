import { User, ConnectEvent, Report, Group, Notification } from '../models/index.js';
import { cancelWithNotice } from './connectEventController.js';
import { leaveAndPromote } from '../services/attendance.js';
import { afterPromotion } from '../services/promotion.js';
import { transferGroup } from '../services/groupAdmin.js';
import { SPORT_KEYS } from '../config/sports.js';
import { cleanText } from '../utils/text.js';
import { Comment, Feedback } from '../models/index.js';
import { effectiveStatus } from '../utils/serializeEvent.js';

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  city: u.city || '',
  sports: u.sports || [],
  emailNotifications: u.emailNotifications !== false,
});

/**
 * Before an account is deleted: Stammspiele it organizes go to the longest-serving
 * co-host, or end (and their open game is called off). Memberships, co-host roles
 * and blocks are removed everywhere.
 */
async function removeFromStammspiele(uid, now) {
  const organized = await Group.find({ organizer: uid, active: true }).lean();
  for (const g of organized) {
    const coHosts = (g.coHosts || []).map(String).filter((c) => c !== String(uid));
    const successor = (g.members || [])
      .filter((m) => coHosts.includes(String(m.user)))
      .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))[0];
    if (successor) {
      await transferGroup(g, successor.user, {
        keepPrevious: false,
        reason: 'Die bisherige Organisator:in hat ihr Konto gelöscht. Als Co-Host übernimmst du jetzt das Stammspiel.',
      });
    } else {
      await Group.updateOne({ _id: g._id }, { $set: { active: false, endedAt: now } });
      const open = await ConnectEvent.find({ group: g._id, status: { $in: ['open', 'full'] }, startAt: { $gt: now } }).lean();
      for (const e of open) await cancelWithNotice(e, 'Die Organisator:in hat ihr Konto gelöscht', uid);
    }
  }
  await Group.updateMany({}, { $pull: { members: { user: uid }, coHosts: uid, blocked: uid } });
}

/** PUT /api/users/me — name, city, sports only. */
const updateMe = async (req, res) => {
  const set = {};
  if (req.body.name !== undefined) {
    const name = cleanText(String(req.body.name));
    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: 'Name muss 2–80 Zeichen lang sein', errors: { name: 'Ungültiger Name' } });
    }
    set.name = name;
  }
  if (req.body.city !== undefined) set.city = cleanText(String(req.body.city)).slice(0, 100);
  if (req.body.sports !== undefined) {
    if (!Array.isArray(req.body.sports) || !req.body.sports.every((s) => SPORT_KEYS.includes(s))) {
      return res.status(400).json({ message: 'Ungültige Sportarten', errors: { sports: 'Ungültige Sportarten' } });
    }
    set.sports = [...new Set(req.body.sports)];
  }

  if (req.body.emailNotifications !== undefined) {
    if (typeof req.body.emailNotifications !== 'boolean') {
      return res.status(400).json({ message: 'Ungültige Einstellung', errors: { emailNotifications: 'Ungültig' } });
    }
    set.emailNotifications = req.body.emailNotifications;
  }

  const user = await User.findByIdAndUpdate(req.user._id, { $set: set }, { new: true, runValidators: true });
  res.json({ user: publicUser(user) });
};

/** PUT /api/users/me/password */
const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.validated.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ message: 'Aktuelles Passwort ist falsch' });
  }

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Passwort erfolgreich geändert' });
};

/**
 * DELETE /api/users/me — GDPR account deletion.
 * - own upcoming events with other participants are cancelled (visible to them)
 * - own events without other participants are deleted
 * - the user is removed from events they joined
 * - reports keep their content but lose the reporter reference
 */
const deleteMe = async (req, res) => {
  const { password } = req.validated.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(password))) {
    return res.status(400).json({ message: 'Bitte bestätige mit deinem Passwort' });
  }

  const uid = user._id;
  const now = new Date();
  await removeFromStammspiele(uid, now);

  const own = await ConnectEvent.find({ creator: uid }).lean();
  for (const e of own) {
    const others = e.participants.filter((p) => p.toString() !== uid.toString());
    if (others.length > 0 && e.endAt >= now && ['open', 'full'].includes(e.status)) {
      await cancelWithNotice(e, 'Der Organisator hat sein Konto gelöscht', uid);
      await ConnectEvent.updateOne({ _id: e._id }, { $pull: { participants: uid } });
    } else if (others.length === 0) {
      await ConnectEvent.deleteOne({ _id: e._id });
    } else {
      await ConnectEvent.updateOne({ _id: e._id }, { $pull: { participants: uid } });
    }
  }

  // Upcoming games: free the spot properly, so the waiting list moves up.
  const upcoming = await ConnectEvent.find({
    $or: [{ participants: uid }, { waitlist: uid }],
    creator: { $ne: uid },
    status: { $in: ['open', 'full'] },
    startAt: { $gt: now },
  }).lean();
  for (const e of upcoming) {
    const r = await leaveAndPromote(e._id, uid, { now, requireMember: true, allowCreator: true });
    if (r) await afterPromotion(r.after, r.promoted, now);
  }

  // Everything else: leave past games and remove every trace of answers and marks.
  await ConnectEvent.updateMany({ participants: uid, creator: { $ne: uid } }, [
    { $set: { participants: { $filter: { input: '$participants', cond: { $ne: ['$$this', uid] } } } } },
    {
      $set: {
        status: {
          $cond: [
            { $and: [{ $eq: ['$status', 'full'] }, { $lt: [{ $size: '$participants' }, '$maxParticipants'] }] },
            'open',
            '$status',
          ],
        },
      },
    },
  ]);
  await ConnectEvent.updateMany(
    {},
    { $pull: { waitlist: uid, responses: { user: uid }, noShows: { user: uid }, pendingPromotions: { user: uid } } }
  );
  await Notification.deleteMany({ user: uid });
  // What the person wrote under events goes with the account; feedback stays without a link to them.
  await Comment.deleteMany({ author: uid });
  await Feedback.updateMany({ user: uid }, { $set: { user: null } });

  await Report.updateMany({ reporter: uid }, { $set: { reporter: null } });
  await User.deleteOne({ _id: uid });

  res.json({ message: 'Dein Konto wurde gelöscht' });
};

const getAllUsers = async (req, res) => {
  const users = await User.find().select('name email role city createdAt').sort({ createdAt: -1 }).limit(500).lean();
  res.json({ users });
};

export { updateMe, updatePassword, deleteMe, getAllUsers };

// ── Data export ("Deine Daten") ──

const EXPORT_LIMIT = 5000;
const idText = (v) => (v ? v.toString() : null);
const sameId = (a, b) => !!a && !!b && a.toString() === b.toString();

/** What the export says about an event: facts only, no organizer and no participants. */
const exportEvent = (e, now) => ({
  id: idText(e._id),
  title: e.title,
  sport: e.sport,
  startAt: e.startAt,
  endAt: e.endAt,
  placeName: e.location?.placeName || '',
  city: e.location?.city || '',
  status: effectiveStatus(e, now),
});

/**
 * GET /api/users/me/export — a copy of everything stored about the signed-in person,
 * as a JSON download. Nothing is looked up about other people: no names, no email
 * addresses (notification texts are copied as the person already sees them in the app).
 * Left out on purpose: password hash, tokens, calendar key and push endpoints.
 */
export const exportMe = async (req, res) => {
  const uid = req.user._id;
  const now = new Date();
  const eventFields = 'title sport startAt endAt location.placeName location.city status creator';
  const newestFirst = (query, by = 'startAt') => query.sort({ [by]: -1 }).limit(EXPORT_LIMIT).lean();

  const [user, mine, waiting, answered, marked, groups, notifications, reports, comments, feedback] = await Promise.all([
    User.findById(uid).select('+pushSubscriptions').lean(),
    newestFirst(ConnectEvent.find({ $or: [{ creator: uid }, { participants: uid }] }).select(eventFields)),
    newestFirst(ConnectEvent.find({ waitlist: uid }).select(`${eventFields} waitlist`)),
    newestFirst(ConnectEvent.find({ 'responses.user': uid }).select('title startAt responses')),
    newestFirst(ConnectEvent.find({ 'noShows.user': uid }).select('title startAt noShows')),
    newestFirst(
      Group.find({ $or: [{ organizer: uid }, { coHosts: uid }, { 'members.user': uid }] }).select(
        'name sport organizer coHosts members active location.city createdAt'
      ),
      'createdAt'
    ),
    newestFirst(Notification.find({ user: uid }).select('type title body createdAt readAt'), 'createdAt'),
    newestFirst(Report.find({ reporter: uid }).select('reason text status event createdAt'), 'createdAt'),
    newestFirst(Comment.find({ author: uid }).select('event kind text createdAt'), 'createdAt'),
    newestFirst(Feedback.find({ user: uid }).select('kind text page status createdAt'), 'createdAt'),
  ]);

  const savedIds = user.savedEvents || [];
  const saved = savedIds.length ? await ConnectEvent.find({ _id: { $in: savedIds } }).select('title').lean() : [];

  const data = {
    exportedAt: now.toISOString(),
    hinweis:
      'Das ist eine Kopie der Daten, die Hobbook über dich gespeichert hat. Listen mit Namen oder E-Mail-Adressen anderer Personen sind nicht enthalten, ebenso wenig dein Passwort, Anmelde-Schlüssel oder dein Kalender-Link. Benachrichtigungen stehen so drin, wie du sie in der App siehst.',
    account: {
      name: user.name,
      email: user.email,
      city: user.city || '',
      sports: user.sports || [],
      role: user.role,
      createdAt: user.createdAt,
      emailNotifications: user.emailNotifications !== false,
      emailVerifiedAt: user.emailVerifiedAt || null,
      ageConfirmedAt: user.ageConfirmedAt || null,
      alerts: (user.alerts || []).map((a) => ({ city: a.city, sport: a.sport || null, createdAt: a.createdAt })),
      pushSubscriptionCount: (user.pushSubscriptions || []).length,
    },
    eventsOrganized: mine.filter((e) => sameId(e.creator, uid)).map((e) => exportEvent(e, now)),
    eventsJoined: mine.filter((e) => !sameId(e.creator, uid)).map((e) => exportEvent(e, now)),
    waitlist: waiting.map((e) => ({
      ...exportEvent(e, now),
      position: (e.waitlist || []).findIndex((w) => sameId(w, uid)) + 1,
    })),
    savedEvents: saved.map((e) => ({ id: idText(e._id), title: e.title })),
    stammspiele: groups.map((g) => {
      const member = (g.members || []).find((m) => sameId(m.user, uid));
      const role = sameId(g.organizer, uid) ? 'organizer' : (g.coHosts || []).some((c) => sameId(c, uid)) ? 'cohost' : 'member';
      return {
        id: idText(g._id),
        name: g.name,
        sport: g.sport,
        city: g.location?.city || '',
        role,
        joinedAt: member?.joinedAt || (role === 'organizer' ? g.createdAt : null),
        muted: member ? member.muted === true : false,
        active: g.active !== false,
      };
    }),
    answers: answered.flatMap((e) =>
      (e.responses || [])
        .filter((r) => sameId(r.user, uid))
        .map((r) => ({ eventId: idText(e._id), title: e.title, startAt: e.startAt, answer: r.answer, at: r.at, late: r.late === true }))
    ),
    noShows: marked.flatMap((e) =>
      (e.noShows || [])
        .filter((m) => sameId(m.user, uid))
        .map((m) => ({
          eventId: idText(e._id),
          title: e.title,
          startAt: e.startAt,
          markedAt: m.markedAt,
          disputed: m.disputed === true,
          disputeNote: m.disputeNote || '',
        }))
    ),
    notifications: notifications.map((n) => ({
      type: n.type,
      title: n.title,
      body: n.body || '',
      createdAt: n.createdAt,
      readAt: n.readAt || null,
    })),
    // Without the moderators' notes and without who or what was reported by name.
    reports: reports.map((r) => ({
      about: r.event ? 'event' : 'person',
      reason: r.reason,
      text: r.text || '',
      createdAt: r.createdAt,
      status: r.status,
    })),
    comments: comments.map((c) => ({ eventId: idText(c.event), kind: c.kind, text: c.text, createdAt: c.createdAt })),
    feedback: feedback.map((f) => ({ kind: f.kind, text: f.text, page: f.page || '', status: f.status, createdAt: f.createdAt })),
  };

  res.set({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="hobbook-daten-${now.toISOString().slice(0, 10)}.json"`,
    'Cache-Control': 'no-store',
  });
  res.send(JSON.stringify(data, null, 2));
};
