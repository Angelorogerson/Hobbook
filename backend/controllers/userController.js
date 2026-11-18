import { User, ConnectEvent, Report } from '../models/index.js';
import { SPORT_KEYS } from '../config/sports.js';
import { cleanText } from '../utils/text.js';

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  city: u.city || '',
  sports: u.sports || [],
});

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
  const own = await ConnectEvent.find({ creator: uid }).lean();
  for (const e of own) {
    const others = e.participants.filter((p) => p.toString() !== uid.toString());
    if (others.length > 0 && e.endAt >= now && ['open', 'full'].includes(e.status)) {
      await ConnectEvent.updateOne(
        { _id: e._id },
        {
          $set: { status: 'cancelled', cancelledAt: now, cancelledReason: 'Der Organisator hat sein Konto gelöscht' },
          $pull: { participants: uid },
        }
      );
    } else if (others.length === 0) {
      await ConnectEvent.deleteOne({ _id: e._id });
    } else {
      await ConnectEvent.updateOne({ _id: e._id }, { $pull: { participants: uid } });
    }
  }

  // Leave joined events (reopen if they were full).
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

  await Report.updateMany({ reporter: uid }, { $set: { reporter: null } });
  await User.deleteOne({ _id: uid });

  res.json({ message: 'Dein Konto wurde gelöscht' });
};

const getAllUsers = async (req, res) => {
  const users = await User.find().select('name email role city createdAt').sort({ createdAt: -1 }).limit(500).lean();
  res.json({ users });
};

export { updateMe, updatePassword, deleteMe, getAllUsers };
