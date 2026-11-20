import { User } from '../models/index.js';
import { cityKey } from '../utils/text.js';
import { MAX_ALERTS } from '../validation/alertSchemas.js';

const serializeAlert = (a) => ({ _id: String(a._id), city: a.city, sport: a.sport || null });
const serializeAlerts = (alerts) => (alerts || []).map(serializeAlert);

const sameAlert = (key, sport) => (a) => a.cityKey === key && (a.sport || null) === sport;

/** GET /api/alerts — my search alerts. */
export const getAlerts = async (req, res) => {
  res.json({ alerts: serializeAlerts(req.user.alerts) });
};

/** POST /api/alerts — { city, sport? }. The same city + sport twice returns the existing alert. */
export const createAlert = async (req, res) => {
  const { city } = req.validated.body;
  const sport = req.validated.body.sport || null;
  const key = cityKey(city);

  // One atomic step: add only if this alert doesn't exist yet and there is room.
  const updated = await User.findOneAndUpdate(
    {
      _id: req.user._id,
      alerts: { $not: { $elemMatch: { cityKey: key, sport } } },
      $expr: { $lt: [{ $size: { $ifNull: ['$alerts', []] } }, MAX_ALERTS] },
    },
    { $push: { alerts: { city, cityKey: key, sport, createdAt: new Date() } } },
    { new: true, runValidators: true }
  )
    .select('alerts')
    .lean();

  if (updated) {
    const alert = updated.alerts.find(sameAlert(key, sport));
    return res.status(201).json({ alert: serializeAlert(alert), alerts: serializeAlerts(updated.alerts) });
  }

  const current = await User.findById(req.user._id).select('alerts').lean();
  const existing = (current?.alerts || []).find(sameAlert(key, sport));
  if (existing) {
    return res.json({ alert: serializeAlert(existing), alerts: serializeAlerts(current.alerts) });
  }
  return res.status(409).json({
    message: `Du kannst höchstens ${MAX_ALERTS} Such-Alarme haben. Entferne zuerst einen anderen.`,
  });
};

/** DELETE /api/alerts/:alertId — idempotent. */
export const deleteAlert = async (req, res) => {
  const updated = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $pull: { alerts: { _id: req.params.alertId } } },
    { new: true }
  )
    .select('alerts')
    .lean();
  res.json({ alerts: serializeAlerts(updated?.alerts) });
};
