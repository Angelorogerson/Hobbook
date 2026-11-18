import { cancelWithNotice } from './connectEventController.js';
import { ConnectEvent, Report, User } from '../models/index.js';
import { serializeEvent } from '../utils/serializeEvent.js';
import { displayName } from '../utils/text.js';

/** POST /api/reports — any signed-in user can report an event once while open. */
export const createReport = async (req, res) => {
  const { eventId, userId, reason, text } = req.validated.body;
  if (userId) {
    if (userId === String(req.user._id)) return res.status(400).json({ message: 'Du kannst dich nicht selbst melden' });
    const target = await User.findById(userId).select('_id').lean();
    if (!target) return res.status(404).json({ message: 'Person nicht gefunden' });
    const dup = await Report.findOne({ reporter: req.user._id, targetUser: userId, status: 'open' }).lean();
    if (dup) return res.status(200).json({ message: 'Du hast diese Person bereits gemeldet. Danke!', reportId: dup._id });
    const r = await Report.create({ reporter: req.user._id, targetUser: userId, reason, text: text || '' });
    return res.status(201).json({ message: 'Danke für deine Meldung. Wir prüfen sie.', reportId: r._id });
  }
  const event = await ConnectEvent.findById(eventId).lean();
  if (!event) return res.status(404).json({ message: 'Event nicht gefunden' });

  const existing = await Report.findOne({ reporter: req.user._id, event: eventId, status: 'open' }).lean();
  if (existing) {
    return res.status(200).json({ message: 'Du hast dieses Event bereits gemeldet. Danke!', reportId: existing._id });
  }

  const report = await Report.create({ reporter: req.user._id, event: eventId, reason, text: text || '' });
  res.status(201).json({ message: 'Danke für deine Meldung. Wir prüfen sie.', reportId: report._id });
};

function serializeReport(r) {
  return {
    _id: r._id.toString(),
    reason: r.reason,
    text: r.text,
    status: r.status,
    note: r.note || '',
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt || null,
    reporter: r.reporter ? { _id: r.reporter._id.toString(), displayName: displayName(r.reporter.name) } : null,
    event: r.event && r.event._id ? serializeEvent(r.event) : null,
    targetUser:
      r.targetUser && r.targetUser._id
        ? { _id: r.targetUser._id.toString(), displayName: displayName(r.targetUser.name), active: r.targetUser.isActive !== false }
        : null,
  };
}

/** GET /api/reports?status=open — admin moderation queue. */
export const listReports = async (req, res) => {
  const { status } = req.validated.query;
  const reports = await Report.find(status ? { status } : {})
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('reporter', 'name')
    .populate({ path: 'event', populate: { path: 'creator', select: 'name' } })
    .populate('targetUser', 'name isActive')
    .lean();
  res.json({ reports: reports.map(serializeReport) });
};

/** PATCH /api/reports/:id — resolve/dismiss, optionally cancel the event. */
export const updateReport = async (req, res) => {
  const { status, note, cancelEvent, deactivateUser } = req.validated.body;
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Meldung nicht gefunden' });

  if (cancelEvent) {
    const event = await ConnectEvent.findById(report.event).lean();
    if (event) await cancelWithNotice(event, 'Durch die Moderation entfernt', req.user._id);
  }

  if (deactivateUser && report.targetUser) {
    await User.updateOne({ _id: report.targetUser, role: { $ne: 'admin' } }, { $set: { isActive: false } });
  }

  report.status = status;
  if (note !== undefined) report.note = note;
  if (status !== 'open') {
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
  }
  await report.save();

  const populated = await Report.findById(report._id)
    .populate('reporter', 'name')
    .populate({ path: 'event', populate: { path: 'creator', select: 'name' } })
    .populate('targetUser', 'name isActive')
    .lean();
  res.json({ report: serializeReport(populated) });
};
