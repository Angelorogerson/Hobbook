import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'invite', // new Spieltermin: "Bist du dabei?"
  'nudge', // reminder to answer (non-responders only)
  'decision_on', // the game takes place
  'decision_off', // the game was called off
  'reminder', // starts in about 2 hours
  'changed', // time or place changed
  'cancelled', // cancelled by the organizer or moderation
  'promoted', // moved up from the waiting list
  'weather', // severe weather forecast (hosts)
  'no_show', // marked as not there (can be disputed)
  'joined_group', // someone joined your Stammspiel (hosts)
  'handover', // you organize a Stammspiel now
  'removed', // a host removed you from a Stammspiel
  'spot_passed', // you didn't confirm a spot in time
  'new_event', // a new event matches one of your search alerts
  'comment', // someone wrote under an event you organize or asked about
  'announcement', // a host sent a message to everyone who is in
];

/** In-app notice for one person. Old notices expire after 60 days. */
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 500 },
    link: { type: String, default: '' }, // app path, e.g. /events/:id
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'ConnectEvent' },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    readAt: { type: Date },
    emailStatus: { type: String, enum: ['none', 'sent', 'failed', 'skipped'], default: 'none' },
    createdAt: { type: Date, default: Date.now, expires: 60 * 24 * 3600 },
  },
  { versionKey: false }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });

export default mongoose.model('Notification', notificationSchema);
