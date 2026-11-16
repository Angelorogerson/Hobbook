import { Venue } from '../models/index.js';

const getVenues = async (req, res) => {
  // Admin sieht alle Venues, normale User nur active ones
  const filter = { isActive: true };

  // Filter by sport
  if (req.query.sport) {
    filter.sport = req.query.sport;
  }

  // Filter by city (case-insensitive regex)
  if (req.query.city) {
    filter['address.city'] = { $regex: req.query.city, $options: 'i' };
  }

  // Filter by price range
  if (req.query.minPrice || req.query.maxPrice) {
    filter.pricePerHour = {};
    if (req.query.minPrice) {
      filter.pricePerHour.$gte = Number(req.query.minPrice);
    }
    if (req.query.maxPrice) {
      filter.pricePerHour.$lte = Number(req.query.maxPrice);
    }
  }

  const venues = await Venue.find(filter).sort({ createdAt: -1 });

  res.json({ count: venues.length, venues });
};

const getVenueById = async (req, res) => {
  const venue = await Venue.findById(req.params.id).populate('createdBy', 'name email');

  if (!venue || !venue.isActive) {
    return res.status(404).json({ message: 'Sportstätte nicht gefunden' });
  }

  res.json({ venue });
};

const createVenue = async (req, res) => {
  // Validate required fields
  const { name, sport, address, pricePerHour, capacity } = req.body;

  if (!name || !sport || !address || !pricePerHour || !capacity) {
    return res.status(400).json({ message: 'Alle erforderlichen Felder sind notwendig' });
  }

  // Set default location if not provided
  if (!req.body.location && address.city) {
    // Use default coordinates if location is not provided
    req.body.location = {
      type: 'Point',
      coordinates: [0, 0], // Default coordinates, can be updated later
    };
  }

  req.body.createdBy = req.user._id || req.user.id; // MongoDB uses _id
  req.body.isActive = true; // ← WICHTIG: Sofort aktivieren!
  const venue = await Venue.create(req.body);

  res.status(201).json({ venue });
};

const updateVenue = async (req, res) => {
  const venue = await Venue.findById(req.params.id);

  if (!venue) {
    return res.status(404).json({ message: 'Sportstätte nicht gefunden' });
  }

  // Admin kann alle updaten, aber createdBy darf nicht geändert werden
  if (req.body.createdBy && req.body.createdBy !== venue.createdBy.toString()) {
    return res.status(400).json({ message: 'createdBy kann nicht geändert werden' });
  }

  const updatedVenue = await Venue.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({ venue: updatedVenue });
};

const deleteVenue = async (req, res) => {
  const venue = await Venue.findById(req.params.id);

  if (!venue) {
    return res.status(404).json({ message: 'Sportstätte nicht gefunden' });
  }

  venue.isActive = false;
  await venue.save();

  res.json({ message: 'Sportstätte erfolgreich deaktiviert' });
};

export { getVenues, getVenueById, createVenue, updateVenue, deleteVenue };
