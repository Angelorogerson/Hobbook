import mongoose from 'mongoose';

const connectEventSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    sport: {
      type: String,
      enum: ['football', 'basketball'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    location: {
      name: String,
      address: String,
      city: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: [Number], // [longitude, latitude]
      },
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    startTime: {
      type: String, // Format: "18:00"
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // Format: "20:00"
      required: [true, 'End time is required'],
    },
    maxParticipants: {
      type: Number,
      required: [true, 'Max participants is required'],
      min: 1,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all',
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['open', 'full', 'cancelled', 'completed'],
      default: 'open',
    },
  },
  { timestamps: true }
);

// Pre-save hook: auto-set status to 'full' if participants.length >= maxParticipants
connectEventSchema.pre('save', function (next) {
  if (this.participants && this.participants.length >= this.maxParticipants) {
    this.status = 'full';
  } else if (this.status === 'full' && this.participants && this.participants.length < this.maxParticipants) {
    this.status = 'open';
  }
  next();
});

export default mongoose.model('ConnectEvent', connectEventSchema);
