import { ConnectEvent, Report } from '../models/index.js';
import { serializeEvent } from '../utils/serializeEvent.js';
import { displayName } from '../utils/text.js';

/** POST /api/reports — any signed-in user can report an event once while open. */
export const createReport = async (req, res) => {
  const { eventId, reason, text } = req.validated.body;
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
    .lean();
  res.json({ reports: reports.map(serializeReport) });
};

/** PATCH /api/reports/:id — resolve/dismiss, optionally cancel the event. */
export const updateReport = async (req, res) => {
  const { status, note, cancelEvent } = req.validated.body;
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Meldung nicht gefunden' });

  if (cancelEvent) {
    await ConnectEvent.updateOne(
      { _id: report.event, status: { $in: ['open', 'full'] } },
      { $set: { status: 'cancelled', cancelledAt: new Date(), cancelledReason: 'Durch die Moderation entfernt' } }
    );
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
    .lean();
  res.json({ report: serializeReport(populated) });
};
