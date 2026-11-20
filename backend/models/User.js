import mongoose from 'mongoose';
import { SPORT_KEYS } from '../config/sports.js';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      // Previous pattern rejected valid TLDs longer than 3 chars (e.g. .online, .test).
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Bitte gib eine gültige E-Mail-Adresse ein'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    sports: {
      type: [String],
      enum: SPORT_KEYS,
      default: [],
    },
    city: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Events the user bookmarked ("Gemerkt"). Private: never exposed to others.
    savedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ConnectEvent' }],
    // Set at sign-up: the person confirmed they are at least 16 years old.
    ageConfirmedAt: { type: Date },
    // Emails for invites, decisions, reminders and changes (in-app notices always).
    emailNotifications: { type: Boolean, default: true },
    // Web push subscriptions (one per browser/device). Private.
    pushSubscriptions: {
      type: [
        {
          _id: false,
          endpoint: { type: String, required: true },
          keys: { p256dh: String, auth: String },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      select: false,
      default: [],
    },

    // ── Account security ──
    // Set whenever the password changes; sessions issued before it are no longer valid.
    passwordChangedAt: { type: Date },
    // Password reset by email: only a hash of the one-time token is stored.
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    // Email confirmation: null/undefined = not confirmed yet.
    emailVerifiedAt: { type: Date },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },

    // Secret part of the personal calendar feed address (.ics). Replaced to revoke old links.
    calendarKey: { type: String, select: false },

    // Search alerts ("Sag mir Bescheid"): told when a new public event appears
    // in this city (and sport, when set). At most 5 per person.
    alerts: {
      type: [
        {
          city: { type: String, trim: true, required: true, maxlength: 100 },
          cityKey: { type: String, required: true },
          sport: { type: String, enum: [...SPORT_KEYS, null], default: null },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.index({ 'alerts.cityKey': 1 });

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) {
    return next();
  }
  // One second back, so a session issued right after the change stays valid
  // (JWT "issued at" has whole-second precision).
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

export default mongoose.model('User', userSchema);
