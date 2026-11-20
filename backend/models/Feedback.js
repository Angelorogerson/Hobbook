import mongoose from 'mongoose';

export const FEEDBACK_KINDS = ['idea', 'problem', 'praise', 'other'];
export const FEEDBACK_STATUSES = ['open', 'done'];

/** A message from a user (or guest) to the people who run Hobbook. */
const feedbackSchema = new mongoose.Schema(
  {
    // Null for guests and after the sender deleted their account.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    kind: { type: String, enum: FEEDBACK_KINDS, default: 'other' },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    // App path the person was on when they opened the form (no query string).
    page: { type: String, trim: true, maxlength: 200, default: '' },
    status: { type: String, enum: FEEDBACK_STATUSES, default: 'open' },
  },
  { timestamps: true }
);

feedbackSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Feedback', feedbackSchema);
