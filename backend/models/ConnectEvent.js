import mongoose from 'mongoose';
import { SPORT_KEYS } from '../config/sports.js';

export const EVENT_LEVELS = ['all', 'beginner', 'intermediate', 'advanced'];
export const EVENT_STATUSES = ['open', 'full', 'cancelled', 'completed'];
export const EVENT_VISIBILITIES = ['public', 'unlisted'];
export const DECISIONS = ['open', 'on', 'off'];
export const ANSWERS = ['in', 'out'];

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: (c) =>
          Array.isArray(c) && c.length === 2 && c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90,
        message: 'Ungültige Koordinaten',
      },
    },
  },
  { _id: false }
);

export const locationSchema = new mongoose.Schema(
  {
    placeName: { type: String, trim: true, required: true },
    address: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true },
    // Normalised city used for filtering (lowercase, no diacritics).
    cityKey: { type: String, required: true },
    countryCode: { type: String, trim: true, uppercase: true },
    // Absent when the location has no verified coordinates (legacy data): such
    // events are listed but never placed on the map.
    point: { type: pointSchema, required: false },
  },
  { _id: false }
);

const connectEventSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    sport: { type: String, enum: SPORT_KEYS, required: true },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    // Optional one-liner: what participants should bring ("Hallenschuhe, Wasser").
    bring: { type: String, trim: true, maxlength: 200, default: '' },
    location: { type: locationSchema, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    timezone: { type: String, default: 'Europe/Berlin' },
    maxParticipants: { type: Number, required: true, min: 2, max: 100 },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    level: { type: String, enum: EVENT_LEVELS, default: 'all' },
    visibility: { type: String, enum: EVENT_VISIBILITIES, default: 'public' },
    // Stored status. "completed" is also derived on read from endAt (see serializer).
    status: { type: String, enum: EVENT_STATUSES, default: 'open' },
    cancelledReason: { type: String, trim: true, maxlength: 300 },
    cancelledAt: { type: Date },
    // Set when time or place changes, so participants can be told.
    changedAt: { type: Date },

    // Waiting list (single and Stammspiel games): the first person moves up
    // automatically when someone leaves. Order = position.
    waitlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── Stammspiel occurrence ("Spieltermin") ──
    // Set only for games generated from a weekly Group.
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    // `${groupId}:${local yyyy-mm-dd}` — unique, so generation is idempotent.
    occurrenceKey: { type: String },
    minPlayers: { type: Number, min: 2, max: 100 },
    // Answers are collected until here; then the game is decided automatically.
    deadlineAt: { type: Date },
    decision: { type: String, enum: DECISIONS },
    decidedAt: { type: Date },
    // Explicit answers (in/out). "late" = changed to out after the deadline.
    responses: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        answer: { type: String, enum: ANSWERS, required: true },
        at: { type: Date, required: true },
        late: { type: Boolean, default: false },
      },
    ],

    // Job bookkeeping: each step runs once per game (claimed atomically).
    invitedAt: { type: Date },
    nudgedAt: { type: Date },
    manualNudgeAt: { type: Date },
    reminderSentAt: { type: Date },
    weatherWarnedAt: { type: Date },
    weather: {
      _id: false,
      code: Number,
      tempC: Number,
      precipMm: Number,
      windKmh: Number,
      severe: Boolean,
      summary: String,
      fetchedAt: Date,
    },

    // Moved up from the waiting list shortly before kick-off: must confirm by `confirmBy`,
    // otherwise the spot passes to the next person (services/promotion.js).
    pendingPromotions: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        confirmBy: { type: Date, required: true },
      },
    ],

    // After the game: no-shows marked by a host within 24 h; the person can dispute.
    noShows: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        markedAt: { type: Date, required: true },
        disputed: { type: Boolean, default: false },
        disputeNote: { type: String, trim: true, maxlength: 300 },
      },
    ],
  },
  { timestamps: true }
);

connectEventSchema.index({ 'location.point': '2dsphere' });
connectEventSchema.index({ status: 1, startAt: 1 });
connectEventSchema.index({ 'location.cityKey': 1, startAt: 1 });
connectEventSchema.index({ creator: 1, startAt: -1 });
connectEventSchema.index({ participants: 1, startAt: -1 });
connectEventSchema.index({ occurrenceKey: 1 }, { unique: true, partialFilterExpression: { occurrenceKey: { $type: 'string' } } });
connectEventSchema.index({ group: 1, startAt: -1 });
connectEventSchema.index({ 'pendingPromotions.confirmBy': 1 });
connectEventSchema.index({ startAt: 1, reminderSentAt: 1 });

export default mongoose.model('ConnectEvent', connectEventSchema);
