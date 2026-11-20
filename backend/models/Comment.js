import mongoose from 'mongoose';

export const COMMENT_KINDS = ['comment', 'announcement'];

/**
 * A short public message on an event page ("Fragen & Infos").
 * - comment: a question or answer from any signed-in person
 * - announcement: a message from a host; participants are notified
 */
const commentSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'ConnectEvent', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: COMMENT_KINDS, default: 'comment' },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

commentSchema.index({ event: 1, createdAt: 1 });
commentSchema.index({ author: 1 });

export default mongoose.model('Comment', commentSchema);
