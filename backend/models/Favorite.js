import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ConnectEvent',
    },
  },
  { timestamps: true }
);

// Unique compound index on user + venue/event
favoriteSchema.index({ user: 1, venue: 1 });
favoriteSchema.index({ user: 1, event: 1 });

// At least one of venue or event must exist
favoriteSchema.pre('save', function(next) {
  if (!this.venue && !this.event) {
    throw new Error('Entweder venue oder event ist erforderlich');
  }
  next();
});

export default mongoose.model('Favorite', favoriteSchema);
