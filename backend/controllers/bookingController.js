import { Booking, Venue } from '../models/index.js';

const createBooking = async (req, res) => {
  try {
    const { venue, venueId, date, startTime, endTime, sport, notes } = req.body;
    const venueId_param = venue || venueId; // Handle both variable names
    const userId = req.user._id || req.user.id; // MongoDB uses _id

    if (!venueId_param || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Alle erforderlichen Felder sind notwendig' });
    }

    // Find venue
    const venueDoc = await Venue.findById(venueId_param);
    if (!venueDoc) {
      return res.status(404).json({ message: 'Sportstätte nicht gefunden' });
    }

    // Check for conflicts
    const conflict = await Booking.findOne({
      venue: venueId_param,
      date: new Date(date),
      status: { $nin: ['cancelled'] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflict) {
      return res.status(409).json({ message: 'Dieser Zeitslot ist bereits gebucht' });
    }

    // Calculate durationHours
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const durationHours = (endHour + endMin / 60) - (startHour + startMin / 60);

    if (durationHours <= 0) {
      return res.status(400).json({ message: 'Endzeit muss nach Startzeit liegen' });
    }

    // Calculate totalPrice
    const totalPrice = venueDoc.pricePerHour * durationHours;

    // Create booking
    const booking = await Booking.create({
      user: userId,
      venue: venueId_param,
      date: new Date(date),
      startTime,
      endTime,
      durationHours,
      totalPrice,
      sport,
      notes,
      status: 'confirmed', // ← Sofort bestätigt statt pending
      paymentStatus: 'unpaid',
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('venue', 'name address')
      .populate('user', 'name email');

    res.status(201).json({ booking: populatedBooking });
  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ message: error.message || 'Fehler beim Erstellen der Buchung' });
  }
};

const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate('venue', 'name address images pricePerHour')
    .sort({ date: -1 });

  res.json({ bookings });
};

const getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('venue')
    .populate('user', 'name email');

  if (!booking) {
    return res.status(404).json({ message: 'Buchung nicht gefunden' });
  }

  // User kann nur ihre eigene Buchung sehen, Admins sehen alles
  if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Zugriff verweigert - nur eigene Buchung oder Admin' });
  }

  res.json({ booking });
};

const cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ message: 'Buchung nicht gefunden' });
  }

  // User kann nur ihre eigene Buchung stornieren, Admins können alle stornieren
  if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Zugriff verweigert - nur eigene Buchung oder Admin' });
  }

  if (booking.status === 'cancelled') {
    return res.status(400).json({ message: 'Buchung bereits storniert' });
  }

  booking.status = 'cancelled';
  booking.cancelledAt = Date.now();
  booking.cancellationReason = req.body.reason || '';

  if (booking.paymentStatus === 'paid') {
    booking.paymentStatus = 'refunded';
  }

  await booking.save();

  res.json({ booking });
};

const getBookedSlots = async (req, res) => {
  const { venueId } = req.params;
  const { date } = req.query;

  const bookings = await Booking.find({
    venue: venueId,
    date: new Date(date),
    status: { $nin: ['cancelled'] },
  });

  const slots = bookings.map((b) => ({
    startTime: b.startTime,
    endTime: b.endTime,
  }));

  res.json({ slots });
};

const getAllBookings = async (req, res) => {
  const bookings = await Booking.find()
    .populate('user', 'name email')
    .populate('venue', 'name')
    .sort({ createdAt: -1 });

  res.json({ bookings });
};

export { createBooking, getMyBookings, getBookingById, cancelBooking, getBookedSlots, getAllBookings };
