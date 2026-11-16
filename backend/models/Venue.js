import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    sport: {
      type: String,
      enum: ['football', 'basketball', 'both'],
      required: true,
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      zip: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    images: [
      {
        type: String,
      },
    ],
    pricePerHour: {
      type: Number,
      required: [true, 'Price per hour is required'],
      min: 0,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'active',
      min: 1,
    },
    amenities: [
      {
        type: String,
        enum: ['parking', 'lighting', 'changing_rooms', 'showers', 'spectator_area', 'bar', 'wifi'],
      },
    ],
    openingHours: [
      {
        day: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          required: true,
        },
        open: String, // Format: "09:00"
        close: String, // Format: "22:00"
        isClosed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// 2dsphere index on location for geospatial queries
venueSchema.index({ location: '2dsphere' });

export default mongoose.model('Venue', venueSchema);
