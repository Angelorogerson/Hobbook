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
  },
  { timestamps: true }
);

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) {
    return next();
  }

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
