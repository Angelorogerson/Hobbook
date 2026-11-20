import { Feedback } from '../models/index.js';
import { displayName } from '../utils/text.js';

const THANKS = 'Danke für dein Feedback! Wir lesen jede Nachricht.';

const isFilled = (value) => (typeof value === 'string' ? value.trim() !== '' : value !== undefined && value !== null && value !== false);

/** POST /api/feedback: a message to the operators, from anyone (guests too). */
export const createFeedback = async (req, res) => {
  const { kind, text, page, website } = req.validated.body;
  // Honeypot filled in: a bot. Answer like a success, store nothing.
  if (isFilled(website)) return res.status(201).json({ message: THANKS });

  await Feedback.create({ user: req.user ? req.user._id : null, kind, text, page: page || '' });
  res.status(201).json({ message: THANKS });
};

/** Never an email address: only the public short name, or "Gast". */
function serializeFeedback(f) {
  return {
    _id: f._id.toString(),
    kind: f.kind,
    text: f.text,
    page: f.page || '',
    status: f.status,
    createdAt: f.createdAt,
    from: f.user && f.user.name ? displayName(f.user.name) : 'Gast',
  };
}

/** GET /api/feedback?status=open|done: admin inbox, newest first. */
export const listFeedback = async (req, res) => {
  const { status } = req.validated.query;
  const items = await Feedback.find(status ? { status } : {})
    .sort({ createdAt: -1, _id: -1 })
    .limit(200)
    .populate('user', 'name')
    .lean();
  res.json({ feedback: items.map(serializeFeedback) });
};

/** PATCH /api/feedback/:id: mark as done or open it again. */
export const updateFeedback = async (req, res) => {
  const item = await Feedback.findByIdAndUpdate(req.params.id, { $set: { status: req.validated.body.status } }, { new: true })
    .populate('user', 'name')
    .lean();
  if (!item) return res.status(404).json({ message: 'Feedback nicht gefunden' });
  res.json({ feedback: serializeFeedback(item) });
};

/** DELETE /api/feedback/:id */
export const deleteFeedback = async (req, res) => {
  const item = await Feedback.findByIdAndDelete(req.params.id).lean();
  if (!item) return res.status(404).json({ message: 'Feedback nicht gefunden' });
  res.json({ message: 'Feedback gelöscht' });
};
