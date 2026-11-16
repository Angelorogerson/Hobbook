import { User } from '../models/index.js';

const updateMe = async (req, res) => {
  const { name, city, sports, phone, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, city, sports, phone, avatar },
    { new: true, runValidators: true }
  );

  res.json({ user });
};

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ message: 'Aktuelles Passwort ist falsch' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Passwort erfolgreich geändert' });
};

const getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');

  res.json({ users });
};

// ─── FAVORITES ───
const addFavorite = async (req, res) => {
  const { venueId } = req.body;

  if (!venueId) {
    return res.status(400).json({ message: 'venueId ist erforderlich' });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User nicht gefunden' });
  }

  // Check if already in favorites
  if (user.favorites.includes(venueId)) {
    return res.status(400).json({ message: 'Dieses Venue ist bereits in Favoriten' });
  }

  user.favorites.push(venueId);
  await user.save();

  res.json({ favorites: user.favorites });
};

const removeFavorite = async (req, res) => {
  // Handle both body and query params
  const venueId = req.body?.venueId || req.query?.venueId;

  if (!venueId) {
    return res.status(400).json({ message: 'venueId ist erforderlich' });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'User nicht gefunden' });
  }

  // Remove from favorites
  user.favorites = user.favorites.filter((id) => id.toString() !== venueId);
  await user.save();

  res.json({ favorites: user.favorites });
};

const getFavorites = async (req, res) => {
  const user = await User.findById(req.user._id).populate('favorites');

  if (!user) {
    return res.status(404).json({ message: 'User nicht gefunden' });
  }

  res.json({ favorites: user.favorites });
};

export { updateMe, updatePassword, getAllUsers, addFavorite, removeFavorite, getFavorites };
