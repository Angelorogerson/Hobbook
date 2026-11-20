import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

/**
 * True when the session token was issued before the account's password last
 * changed (reset by email or changed in the profile): such sessions are no
 * longer valid. JWT "iat" is in whole seconds.
 */
export const issuedBeforePasswordChange = (decoded, user) => {
  if (!user?.passwordChangedAt) return false;
  if (typeof decoded?.iat !== 'number') return true;
  return decoded.iat < Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Nicht autorisiert – kein Token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User nicht gefunden' });
    }
    if (req.user.isActive === false) {
      return res.status(401).json({ message: 'Dieses Konto ist gesperrt' });
    }
    if (issuedBeforePasswordChange(decoded, req.user)) {
      req.user = undefined;
      return res.status(401).json({ message: 'Dein Passwort wurde geändert. Bitte melde dich neu an.' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token ungültig oder abgelaufen' });
  }
};

export default protect;