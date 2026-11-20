import { Comment, ConnectEvent, Group } from '../models/index.js';
import { notify } from '../services/notify.js';
import { displayName } from '../utils/text.js';

// "Fragen & Infos": short public messages on an event page.
//   comment      – a question or answer from any signed-in person
//   announcement – a message from a host; everyone who is in gets a notice

const LIST_LIMIT = 200;
const MAX_PER_PERSON = 20;
const MAX_PER_HOST = 100;
const CLOSED_AFTER_MS = 7 * 24 * 3600 * 1000;
const NOTICE_BODY_LENGTH = 200;

const notFound = (res) => res.status(404).json({ message: 'Event nicht gefunden' });
const idOf = (v) => (v && v._id ? String(v._id) : v ? String(v) : null);
const shorten = (text, max = NOTICE_BODY_LENGTH) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** The event plus the ids of the people who run it (creator; for a Stammspiel also organizer and co-hosts). */
async function loadContext(eventId) {
  const event = await ConnectEvent.findById(eventId)
    .select('title creator group participants waitlist endAt')
    .lean();
  if (!event) return null;
  const hosts = new Set([idOf(event.creator)]);
  if (event.group) {
    const group = await Group.findById(event.group).select('organizer coHosts').lean();
    if (group) [group.organizer, ...(group.coHosts || [])].forEach((id) => hosts.add(idOf(id)));
  }
  hosts.delete(null);
  return { event, hosts };
}

const isAdmin = (user) => user?.role === 'admin';

function serializeComment(comment, { viewer, hosts }) {
  const authorId = idOf(comment.author);
  const viewerId = viewer ? String(viewer._id) : null;
  return {
    _id: String(comment._id),
    kind: comment.kind || 'comment',
    text: comment.text,
    createdAt: comment.createdAt,
    author: {
      _id: authorId,
      displayName: displayName(comment.author?.name),
      isHost: !!authorId && hosts.has(authorId),
    },
    canDelete: !!viewerId && (viewerId === authorId || hosts.has(viewerId) || isAdmin(viewer)),
  };
}

/** GET /api/events/:id/comments — public, oldest first. */
export const listComments = async (req, res) => {
  const ctx = await loadContext(req.params.id);
  if (!ctx) return notFound(res);
  const comments = await Comment.find({ event: ctx.event._id })
    .sort({ createdAt: 1, _id: 1 })
    .limit(LIST_LIMIT)
    .populate('author', 'name')
    .lean();
  return res.json({ comments: comments.map((c) => serializeComment(c, { viewer: req.user, hosts: ctx.hosts })) });
};

/** Tell the right people about a new message. Never throws. */
async function sendNotices({ event, hosts, comment, authorId, authorIsHost }) {
  const base = { body: shorten(comment.text), link: `/events/${event._id}`, event, group: event.group || undefined };
  try {
    if (comment.kind === 'announcement') {
      const users = [...(event.participants || []), ...(event.waitlist || [])].map(String).filter((id) => id !== authorId);
      await notify({ ...base, users, type: 'announcement', title: `Nachricht zu „${event.title}“` });
    } else if (authorIsHost) {
      // An answer: everyone who asked something here before.
      const askers = await Comment.distinct('author', {
        event: event._id,
        _id: { $ne: comment._id },
        author: { $nin: [...hosts] },
      });
      const users = askers.map(String).filter((id) => id !== authorId);
      await notify({ ...base, users, type: 'comment', title: `Antwort zu „${event.title}“`, email: false });
    } else {
      const users = [...hosts].filter((id) => id !== authorId);
      await notify({ ...base, users, type: 'comment', title: `Neue Frage zu „${event.title}“`, email: false });
    }
  } catch (err) {
    console.error('Benachrichtigung zu Kommentar fehlgeschlagen', err);
  }
}

/** POST /api/events/:id/comments — signed-in people; announcements only from hosts. */
export const createComment = async (req, res) => {
  const ctx = await loadContext(req.params.id);
  if (!ctx) return notFound(res);
  const { event, hosts } = ctx;
  const { text, kind = 'comment' } = req.validated.body;
  const authorId = String(req.user._id);
  const authorIsHost = hosts.has(authorId);

  if (kind === 'announcement' && !authorIsHost && !isAdmin(req.user)) {
    return res.status(403).json({ message: 'Nur Organisator:innen können eine Nachricht an alle senden' });
  }
  if (event.endAt && new Date(event.endAt).getTime() < Date.now() - CLOSED_AFTER_MS) {
    return res.status(409).json({ message: 'Dieses Event ist schon länger vorbei. Hier kann nichts mehr geschrieben werden.' });
  }

  const [mine, total] = await Promise.all([
    Comment.countDocuments({ event: event._id, author: req.user._id }),
    Comment.countDocuments({ event: event._id }),
  ]);
  if (mine >= (authorIsHost ? MAX_PER_HOST : MAX_PER_PERSON)) {
    return res.status(429).json({ message: 'Du hast hier schon sehr viel geschrieben. Lösche ältere Nachrichten, um neue zu schreiben.' });
  }
  if (total >= LIST_LIMIT) {
    return res.status(409).json({ message: 'Hier ist kein Platz mehr für weitere Nachrichten.' });
  }

  const comment = await Comment.create({ event: event._id, author: req.user._id, kind, text });
  await sendNotices({ event, hosts, comment, authorId, authorIsHost });

  const out = serializeComment(
    { ...comment.toObject(), author: { _id: req.user._id, name: req.user.name } },
    { viewer: req.user, hosts }
  );
  return res.status(201).json({ comment: out });
};

/** DELETE /api/events/:id/comments/:commentId — the author, a host of the event or an admin. */
export const deleteComment = async (req, res) => {
  const ctx = await loadContext(req.params.id);
  if (!ctx) return notFound(res);
  const comment = await Comment.findOne({ _id: req.params.commentId, event: ctx.event._id }).select('author').lean();
  if (!comment) return res.status(404).json({ message: 'Nachricht nicht gefunden' });

  const uid = String(req.user._id);
  if (!(uid === String(comment.author) || ctx.hosts.has(uid) || isAdmin(req.user))) {
    return res.status(403).json({ message: 'Du kannst nur deine eigenen Nachrichten löschen' });
  }
  await Comment.deleteOne({ _id: comment._id });
  return res.json({ message: 'Nachricht gelöscht' });
};
