import { User, ConnectEvent, Report, Group, Notification } from '../models/index.js';
import { cancelWithNotice } from './connectEventController.js';
import { leaveAndPromote } from '../services/attendance.js';
import { afterPromotion } from '../services/promotion.js';
import { transferGroup } from '../services/groupAdmin.js';
import { SPORT_KEYS } from '../config/sports.js';
import { cleanText } from '../utils/text.js';

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

  await Report.updateMany({ reporter: uid }, { $set: { reporter: null } });
  await User.deleteOne({ _id: uid });

  res.json({ message: 'Dein Konto wurde gelöscht' });
};

const getAllUsers = async (req, res) => {
  const users = await User.find().select('name email role city createdAt').sort({ createdAt: -1 }).limit(500).lean();
  res.json({ users });
};

export { updateMe, updatePassword, deleteMe, getAllUsers };
