import { Favorite, Venue, ConnectEvent } from '../models/index.js';

const getFavorites = async (req, res) => {
  const favorites = await Favorite.find({ user: req.user.id })
    .populate('venue')
    .populate('event');

  // Split into venues and events
  const venues = favorites.filter(f => f.venue).map(f => f.venue).filter(Boolean);
  const events = favorites.filter(f => f.event).map(f => f.event).filter(Boolean);

  res.json({ 
    favorites: venues, // For backward compatibility
    venues: venues,
    events: events 
  });
};

const addFavorite = async (req, res) => {
  try {
    const { venueId, eventId } = req.params;

    if (venueId) {
      // Check if already exists
      const existing = await Favorite.findOne({ user: req.user.id, venue: venueId });
      if (existing) {
        return res.status(400).json({ message: 'Bereits als Favorit gespeichert' });
      }

      // Verify venue exists
      const venue = await Venue.findById(venueId);
      if (!venue) {
        return res.status(404).json({ message: 'Sportstätte nicht gefunden' });
      }

      await Favorite.create({ user: req.user.id, venue: venueId });
      res.status(201).json({ message: 'Favorit hinzugefügt' });
    } else if (eventId) {
      // Check if already exists
      const existing = await Favorite.findOne({ user: req.user.id, event: eventId });
      if (existing) {
        return res.status(400).json({ message: 'Bereits als Favorit gespeichert' });
      }

      // Verify event exists
      const event = await ConnectEvent.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Event nicht gefunden' });
      }

      await Favorite.create({ user: req.user.id, event: eventId });
      res.status(201).json({ message: 'Favorit hinzugefügt' });
    } else {
      res.status(400).json({ message: 'venueId oder eventId erforderlich' });
    }
  } catch (err) {
    console.error('Error in addFavorite:', err);
    res.status(500).json({ message: 'Fehler beim Hinzufügen des Favorits' });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { venueId, eventId } = req.params;

    if (venueId) {
      await Favorite.findOneAndDelete({ user: req.user.id, venue: venueId });
      res.json({ message: 'Favorit entfernt' });
    } else if (eventId) {
      await Favorite.findOneAndDelete({ user: req.user.id, event: eventId });
      res.json({ message: 'Favorit entfernt' });
    } else {
      res.status(400).json({ message: 'venueId oder eventId erforderlich' });
    }
  } catch (err) {
    console.error('Error in removeFavorite:', err);
    res.status(500).json({ message: 'Fehler beim Entfernen des Favorits' });
  }
};

export { getFavorites, addFavorite, removeFavorite };
