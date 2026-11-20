import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import {
  RESET_TTL_MS,
  VERIFY_TTL_MS,
  hashToken,
  newToken,
  sendPasswordResetMail,
  sendVerifyMail,
} from '../services/accountMail.js';

export const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sessionUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  emailVerified: Boolean(user.emailVerifiedAt),
});

const BLOCKED_MESSAGE = 'Dieses Konto ist gesperrt. Wenn du denkst, das ist ein Fehler, schreib uns (Kontakt im Impressum).';

/** Send an email after the response: a slow or failing mail service must not hold up or break the request. */
const inBackground = (send) => {
  try {
    Promise.resolve(send()).catch((err) => console.error('[mail] failed:', err.message));
  } catch (err) {
    console.error('[mail] failed:', err.message);
  }
};

/** POST /api/auth/register — body validated by registerSchema. */
const register = async (req, res) => {
  const { name, email, password } = req.validated.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'E-Mail bereits registriert', errors: { email: 'E-Mail bereits registriert' } });
  }

  const verify = newToken();
  const user = await User.create({
    name,
    email,
    password,
    ageConfirmedAt: new Date(),
    emailVerifyTokenHash: verify.hash,
    emailVerifyExpires: new Date(Date.now() + VERIFY_TTL_MS),
  });
  // Soft confirmation: the account works right away, with or without this email.
  inBackground(() => sendVerifyMail(user, verify.token));

  res.status(201).json({ token: signToken(user), user: sessionUser(user) });
};

/** POST /api/auth/login — body validated by loginSchema. */
const login = async (req, res) => {
  const { email, password } = req.validated.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
  }
  if (user.isActive === false) {
    return res.status(403).json({ message: BLOCKED_MESSAGE });
  }

  res.status(200).json({ token: signToken(user), user: sessionUser(user) });
};

const getMe = async (req, res) => {
  const u = req.user;
  res.json({
    user: {
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      city: u.city || '',
      sports: u.sports || [],
      emailNotifications: u.emailNotifications !== false,
      emailVerified: Boolean(u.emailVerifiedAt),
    },
  });
};

/**
 * POST /api/auth/forgot — body validated by forgotPasswordSchema.
 * Always the same answer, so nobody can find out which addresses have an account.
 */
const forgotPassword = async (req, res) => {
  const { email } = req.validated.body;

  const user = await User.findOne({ email });
  if (user && user.isActive !== false) {
    const reset = newToken();
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordResetTokenHash: reset.hash, passwordResetExpires: new Date(Date.now() + RESET_TTL_MS) } }
    );
    inBackground(() => sendPasswordResetMail(user, reset.token));
  }

  res.json({
    message: 'Wenn es ein Konto mit dieser E-Mail-Adresse gibt, haben wir dir einen Link geschickt. Er gilt 60 Minuten.',
  });
};

/** POST /api/auth/reset — body validated by resetPasswordSchema. Answers like login. */
const resetPassword = async (req, res) => {
  const { token, password } = req.validated.body;

  // Claim the token in one step, so a link can never be used twice (not even by two requests at once).
  const user = await User.findOneAndUpdate(
    { passwordResetTokenHash: hashToken(token), passwordResetExpires: { $gt: new Date() } },
    { $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 } }
  );
  if (!user) {
    const message = 'Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.';
    return res.status(400).json({ message, errors: { token: message } });
  }
  if (user.isActive === false) {
    return res.status(403).json({ message: BLOCKED_MESSAGE });
  }

  // Saving runs the model hook: hashes the password and sets passwordChangedAt,
  // which ends every session issued before now.
  user.password = password;
  if (!user.emailVerifiedAt) {
    // The link was sent to this address, so the address is confirmed as well.
    user.emailVerifiedAt = new Date();
    user.emailVerifyTokenHash = undefined;
    user.emailVerifyExpires = undefined;
  }
  await user.save();

  res.json({ token: signToken(user), user: sessionUser(user) });
};

/** POST /api/auth/verify — body validated by verifyEmailSchema; optionalAuth. */
const verifyEmail = async (req, res) => {
  const { token } = req.validated.body;

  const user = await User.findOneAndUpdate(
    { emailVerifyTokenHash: hashToken(token), emailVerifyExpires: { $gt: new Date() } },
    { $set: { emailVerifiedAt: new Date() }, $unset: { emailVerifyTokenHash: 1, emailVerifyExpires: 1 } }
  );
  if (user) {
    return res.json({ message: 'Deine E-Mail-Adresse ist bestätigt.', emailVerified: true });
  }

  // A used link looks the same as a wrong one. For someone who is signed in
  // and already confirmed (second click on the link) that is not an error.
  if (req.user?.emailVerifiedAt) {
    return res.json({ message: 'Deine E-Mail-Adresse ist schon bestätigt.', emailVerified: true, alreadyVerified: true });
  }

  const message = 'Dieser Link ist ungültig, abgelaufen oder wurde schon benutzt.';
  res.status(400).json({ message, errors: { token: message } });
};

/** POST /api/auth/verify/resend — signed in; sends a fresh confirmation link. */
const resendVerification = async (req, res) => {
  const user = req.user;
  if (user.emailVerifiedAt) {
    return res.json({ message: 'Deine E-Mail-Adresse ist schon bestätigt.', emailVerified: true });
  }

  const verify = newToken();
  await User.updateOne(
    { _id: user._id },
    { $set: { emailVerifyTokenHash: verify.hash, emailVerifyExpires: new Date(Date.now() + VERIFY_TTL_MS) } }
  );

  // The person asked for this email, so wait and say honestly whether it went out.
  const result = await sendVerifyMail(user, verify.token);
  if (result !== 'sent') {
    return res.status(503).json({ message: 'Die E-Mail konnte gerade nicht gesendet werden. Bitte versuche es später erneut.' });
  }
  res.json({ message: 'Wir haben dir einen neuen Link geschickt. Er gilt 7 Tage.', emailVerified: false });
};

export { register, login, getMe, forgotPassword, resetPassword, verifyEmail, resendVerification };
