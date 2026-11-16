import mongoose from 'mongoose';
import { SPORT_KEYS } from '../config/sports.js';

export const EVENT_LEVELS = ['all', 'beginner', 'intermediate', 'advanced'];
export const EVENT_STATUSES = ['open', 'full', 'cancelled', 'completed'];
export const EVENT_VISIBILITIES = ['public', 'unlisted'];

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

const locationSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

connectEventSchema.index({ 'location.point': '2dsphere' });
connectEventSchema.index({ status: 1, startAt: 1 });
connectEventSchema.index({ 'location.cityKey': 1, startAt: 1 });
connectEventSchema.index({ creator: 1, startAt: -1 });
connectEventSchema.index({ participants: 1, startAt: -1 });

export default mongoose.model('ConnectEvent', connectEventSchema);
