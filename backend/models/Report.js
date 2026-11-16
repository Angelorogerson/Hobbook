import mongoose from 'mongoose';

export const REPORT_REASONS = ['spam', 'inappropriate', 'unsafe', 'wrong_info', 'other'];
export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'];

const reportSchema = new mongoose.Schema(
  {
    // Null after the reporter deleted their account.
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'ConnectEvent', required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    text: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: REPORT_STATUSES, default: 'open' },
    note: { type: String, trim: true, maxlength: 1000 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, event: 1 });

export default mongoose.model('Report', reportSchema);
