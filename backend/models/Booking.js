import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
    },
    date: {
      type: Date,
      required: [true, 'Booking date is required'],
    },
    startTime: {
      type: String, // Format: "15:00"
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // Format: "17:00"
      required: [true, 'End time is required'],
    },
    durationHours: {
      type: Number,
      required: true,
      min: 0.5,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sport: {
      type: String,
      enum: ['football', 'basketball'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    notes: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound index on venue + date + startTime for efficient queries
bookingSchema.index({ venue: 1, date: 1, startTime: 1 });

export default mongoose.model('Booking', bookingSchema);
