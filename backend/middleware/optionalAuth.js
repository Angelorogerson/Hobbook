import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { issuedBeforePasswordChange } from './auth.js';

/**
 * Attach req.user when a valid Bearer token is present; never rejects.
 * Used by public read endpoints so they can mark "joined"/"isOrganizer".
 */
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();

  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    // A session from before a password change counts as signed out.
    if (user && user.isActive !== false && !issuedBeforePasswordChange(decoded, user)) req.user = user;
  } catch {
    // Invalid/expired token on a public route: treat as anonymous.
  }
  return next();
};

export default optionalAuth;
