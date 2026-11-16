import { ConnectEvent } from '../models/index.js';

const getEvents = async (req, res) => {
  const filter = { status: { $in: ['open', 'full'] } };

  // Filter by sport
  if (req.query.sport) {
    filter.sport = req.query.sport;
  }

  // Filter by city (case-insensitive regex)
  if (req.query.city) {
    filter['location.city'] = { $regex: req.query.city, $options: 'i' };
  }

  // Filter by date
  if (req.query.date) {
    const startDate = new Date(req.query.date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    filter.date = { $gte: startDate, $lt: endDate };
  }

  const events = await ConnectEvent.find(filter).populate('creator', 'name avatar');

  res.json({ events });
};

const getEventById = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id)
    .populate('creator', 'name avatar city')
    .populate('participants', 'name avatar');

  if (!event) {
    return res.status(404).json({ message: 'Event nicht gefunden' });
  }

  res.json({ event });
};

const createEvent = async (req, res) => {
  const event = await ConnectEvent.create({
    ...req.body,
    creator: req.user._id,
    participants: [req.user._id],
  });

  const populatedEvent = await ConnectEvent.findById(event._id)
    .populate('creator', 'name avatar')
    .populate('participants', 'name avatar');

  res.status(201).json({ event: populatedEvent });
};

const joinEvent = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id);

  if (!event) {
    return res.status(404).json({ message: 'Event nicht gefunden' });
  }

  if (event.status === 'full') {
    return res.status(400).json({ message: 'Event ist bereits voll' });
  }

  if (event.participants.some(p => p.toString() === req.user._id.toString())) {
    return res.status(400).json({ message: 'Bereits beigetreten' });
  }

  event.participants.push(req.user._id);

  if (event.participants.length >= event.maxParticipants) {
    event.status = 'full';
  }

  await event.save();

  const populatedEvent = await ConnectEvent.findById(event._id)
    .populate('creator', 'name avatar')
    .populate('participants', 'name avatar');

  res.json({ event: populatedEvent });
};

const leaveEvent = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id);

  if (!event) {
    return res.status(404).json({ message: 'Event nicht gefunden' });
  }

  if (!event.participants.some(p => p.toString() === req.user._id.toString())) {
    return res.status(400).json({ message: 'Du bist nicht Teilnehmer dieses Events' });
  }

  if (event.creator.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: 'Ersteller kann das Event nicht verlassen' });
  }

  event.participants = event.participants.filter((p) => p.toString() !== req.user._id.toString());

  if (event.status === 'full' && event.participants.length < event.maxParticipants) {
    event.status = 'open';
  }

  await event.save();

  const populatedEvent = await ConnectEvent.findById(event._id)
    .populate('creator', 'name avatar')
    .populate('participants', 'name avatar');

  res.json({ event: populatedEvent });
};

const deleteEvent = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id);

  if (!event) {
    return res.status(404).json({ message: 'Event nicht gefunden' });
  }

  // Admins dürfen alles löschen, Creator auch
  if (event.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Zugriff verweigert - nur Creator oder Admin' });
  }

  event.status = 'cancelled';
  await event.save();

  res.json({ message: 'Event erfolgreich storniert' });
};

// ─── ADMIN FUNCTIONS ───
const getAllEvents = async (req, res) => {
  const events = await ConnectEvent.find()
    .populate('creator', 'name avatar email')
    .populate('participants', 'name avatar')
    .sort({ createdAt: -1 });

  res.json({ events });
};

const updateEvent = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id);

  if (!event) {
    return res.status(404).json({ message: 'Event nicht gefunden' });
  }

  // Update only allowed fields
  const { title, sport, description, location, date, startTime, endTime, maxParticipants, skillLevel } = req.body;

  if (title) event.title = title;
  if (sport) event.sport = sport;
  if (description) event.description = description;
  if (location) event.location = { ...event.location, ...location };
  if (date) event.date = date;
  if (startTime) event.startTime = startTime;
  if (endTime) event.endTime = endTime;
  if (maxParticipants) event.maxParticipants = maxParticipants;
  if (skillLevel) event.skillLevel = skillLevel;

  await event.save();

  const populatedEvent = await ConnectEvent.findById(event._id)
    .populate('creator', 'name avatar')
    .populate('participants', 'name avatar');

  res.json({ event: populatedEvent });
};

const deleteEventAdmin = async (req, res) => {
  const event = await ConnectEvent.findByIdAndDelete(req.params.id);

  if (!event) {
    return res.status(404).json({ message: 'Event nicht gefunden' });
  }

  res.json({ message: 'Event erfolgreich gelöscht' });
};

const approveEvent = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id);

  if (!event) {
    return res.status(404).json({ message: 'Event nicht gefunden' });
  }

  event.status = 'open';
  await event.save();

  const populatedEvent = await ConnectEvent.findById(event._id)
    .populate('creator', 'name avatar')
    .populate('participants', 'name avatar');

  res.json({ event: populatedEvent });
};

const rejectEvent = async (req, res) => {
  const event = await ConnectEvent.findById(req.params.id);

  if (!event) {
    return res.status(404).json({ message: 'Event nicht gefunden' });
  }

  event.status = 'cancelled';
  await event.save();

  const populatedEvent = await ConnectEvent.findById(event._id)
    .populate('creator', 'name avatar')
    .populate('participants', 'name avatar');

  res.json({ event: populatedEvent });
};

export { getEvents, getEventById, createEvent, joinEvent, leaveEvent, deleteEvent, getAllEvents, updateEvent, deleteEventAdmin, approveEvent, rejectEvent };
