import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Alle Felder erforderlich' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Das Passwort muss mindestens 8 Zeichen haben', errors: { password: 'Mindestens 8 Zeichen' } });
  }

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) {
    return res.status(400).json({ message: 'E-Mail bereits registriert' });
  }

  const user = await User.create({ name, email, password });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.status(201).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Alle Felder erforderlich' });
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.status(200).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

const getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ user });
};

export { register, login, getMe };
