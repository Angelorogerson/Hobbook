import { Notification, User, Group } from '../models/index.js';
import { sendMail } from './mailer.js';
import { sendPush } from './push.js';
import { renderEmail } from './emailTemplate.js';
import { appUrl, signLink } from '../utils/linkToken.js';

const uniqIds = (ids) => [...new Set(ids.filter(Boolean).map(String))];

/** Email buttons that answer a game without signing in (valid until kick-off). */
export function answerButtons(userId, event, { onlyOut = false } = {}) {
  const exp = new Date(event.startAt).getTime();
  const link = (a) => `${appUrl()}/antwort/${signLink({ t: 'answer', u: String(userId), e: String(event._id), a, exp })}`;
  const out = { label: 'Diesmal nicht', href: link('out') };
  return onlyOut ? [out] : [{ label: 'Ich bin dabei', href: link('in'), primary: true }, out];
}

export function muteLink(userId, groupId) {
  const exp = Date.now() + 365 * 24 * 3600 * 1000;
  return `${appUrl()}/stumm/${signLink({ t: 'mute', u: String(userId), g: String(groupId), exp })}`;
}

async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      while (queue.length) await fn(queue.shift());
    })
  );
}

/**
 * Tell people about something: an in-app notice for everyone, plus email and
 * push for those who allow it (and haven't muted the Stammspiel).
 * @param {object} o
 * @param {Array} o.users          user ids
 * @param {string} o.type          see NOTIFICATION_TYPES
 * @param {string} o.title
 * @param {string} [o.body]
 * @param {string} [o.link]        app path
 * @param {object} [o.event]       event doc (for answer links)
 * @param {object|string} [o.group] group doc or id (mute + per-group settings)
 * @param {(user) => ({ lines?: string[], buttons?: object[] })|false} [o.email]  per-recipient email content, false = no email
 * @param {boolean} [o.important]  changes/cancellations: also sent when the Stammspiel is muted
 */
export async function notify({ users, type, title, body = '', link = '', event, group, email, important = false }) {
  const ids = uniqIds(users);
  if (!ids.length) return 0;

  let groupDoc = group && group.members ? group : null;
  const groupId = group ? String(group._id || group) : null;
  if (groupId && !groupDoc) groupDoc = await Group.findById(groupId).select('members').lean();
  const muted = new Set((groupDoc?.members || []).filter((m) => m.muted).map((m) => String(m.user)));

  const docs = await Notification.insertMany(
    ids.map((user) => ({ user, type, title, body, link, event: event?._id, group: groupId || undefined }))
  );

  const reach = ids.filter((id) => important || !muted.has(id));

  // Email
  if (email !== false && reach.length) {
    const people = await User.find({ _id: { $in: reach }, emailNotifications: { $ne: false }, isActive: { $ne: false } })
      .select('name email')
      .lean();
    const status = new Map();
    await pool(people, 5, async (u) => {
      const extra = typeof email === 'function' ? email(u) : {};
      if (extra === false) return;
      const footerLinks = [{ label: 'Benachrichtigungen einstellen', href: `${appUrl()}/profil#benachrichtigungen` }];
      if (groupId) footerLinks.push({ label: 'Dieses Stammspiel stummschalten', href: muteLink(u._id, groupId) });
      const { html, text } = renderEmail({
        title,
        lines: extra?.lines || (body ? [body] : []),
        buttons: extra?.buttons || (link ? [{ label: 'In Hobbook öffnen', href: `${appUrl()}${link}`, primary: true }] : []),
        footerLinks,
      });
      status.set(String(u._id), await sendMail({ to: u.email, toName: u.name, subject: title, html, text }));
    });
    const ops = docs
      .filter((d) => status.has(String(d.user)))
      .map((d) => ({ updateOne: { filter: { _id: d._id }, update: { $set: { emailStatus: status.get(String(d.user)) } } } }));
    if (ops.length) await Notification.bulkWrite(ops);
  }

  // Push (best effort)
  sendPush(reach, { title, body, url: link || '/' }).catch(() => {});
  return ids.length;
}
