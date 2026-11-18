import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sessionUser = (user) => ({ _id: user._id, name: user.name, email: user.email, role: user.role });

/** POST /api/auth/register — body validated by registerSchema. */
const register = async (req, res) => {
  const { name, email, password } = req.validated.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'E-Mail bereits registriert', errors: { email: 'E-Mail bereits registriert' } });
  }

  const user = await User.create({ name, email, password, ageConfirmedAt: new Date() });
  res.status(201).json({ token: signToken(user), user: sessionUser(user) });
};

/** POST /api/auth/login — body validated by loginSchema. */
const login = async (req, res) => {
  const { email, password } = req.validated.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
  }

  res.status(200).json({ token: signToken(user), user: sessionUser(user) });
};

const getMe = async (req, res) => {
  const u = req.user;
  res.json({
    user: { _id: u._id, name: u.name, email: u.email, role: u.role, city: u.city || '', sports: u.sports || [] },
  });
};

export { register, login, getMe };
