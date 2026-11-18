import mongoose from 'mongoose';
import { SPORT_KEYS } from '../config/sports.js';
import { EVENT_LEVELS, EVENT_VISIBILITIES, locationSchema } from './ConnectEvent.js';

export const RSVP_MODES = ['ask', 'autoIn'];

/**
 * A "Stammspiel": a weekly game with members. Each week one ConnectEvent
 * ("Spieltermin") is generated from it (see services/recurrence.js).
 * Time is stored as local weekday + "HH:mm" + time zone, so daylight-saving
 * changes never shift the game.
 */
const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    sport: { type: String, enum: SPORT_KEYS, required: true },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    bring: { type: String, trim: true, maxlength: 200, default: '' },
    level: { type: String, enum: EVENT_LEVELS, default: 'all' },
    location: { type: locationSchema, required: true },

    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coHosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    weekday: { type: Number, min: 1, max: 7, required: true }, // ISO: 1 = Monday … 7 = Sunday
    startTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
    durationMin: { type: Number, min: 30, max: 480, required: true },
    timezone: { type: String, default: 'Europe/Berlin' },

    maxParticipants: { type: Number, min: 2, max: 100, required: true },
    minPlayers: { type: Number, min: 2, max: 100, required: true },
    deadlineHours: { type: Number, min: 1, max: 48, default: 3 },
    openDaysBefore: { type: Number, min: 1, max: 6, default: 5 },
    rsvpMode: { type: String, enum: RSVP_MODES, default: 'ask' },
    visibility: { type: String, enum: EVENT_VISIBILITIES, default: 'public' },

    // Short random code for the invite link /s/:code.
    inviteCode: { type: String, required: true },
    members: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        joinedAt: { type: Date, default: Date.now },
        muted: { type: Boolean, default: false },
      },
    ],
    // Removed and blocked by a host: cannot rejoin or answer.
    blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Local dates (yyyy-mm-dd) that are skipped ("Diese Woche aussetzen").
    skipDates: [{ type: String }],
    active: { type: Boolean, default: true },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

groupSchema.index({ inviteCode: 1 }, { unique: true });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ active: 1 });
groupSchema.index({ 'location.point': '2dsphere' });
groupSchema.index({ 'location.cityKey': 1, active: 1 });

export default mongoose.model('Group', groupSchema);
