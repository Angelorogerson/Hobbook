import crypto from 'node:crypto';
import { sendMail } from './mailer.js';
import { renderEmail } from './emailTemplate.js';
import { appUrl } from '../utils/linkToken.js';

// One-time links for account emails (new password, confirm address).
// The link carries a random token; the database only ever stores its SHA-256 hash,
// so a leaked database does not contain usable links.

export const RESET_TTL_MS = 60 * 60 * 1000; // 60 minutes
export const VERIFY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Shape of a token as it appears in a link: 32 random bytes, hex. */
export const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/** @returns {{ token: string, hash: string }} the token goes into the email, the hash into the database */
export function newToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';
const hello = (user) => (firstName(user.name) ? `Hallo ${firstName(user.name)},` : 'Hallo,');

/** @returns {Promise<'sent'|'failed'|'skipped'>} never throws */
export function sendPasswordResetMail(user, token) {
  const title = 'Neues Passwort festlegen';
  const { html, text } = renderEmail({
    title,
    lines: [
      hello(user),
      'du möchtest ein neues Passwort für dein Hobbook-Konto. Der Link gilt 60 Minuten und funktioniert nur einmal.',
      'Du warst das nicht? Dann musst du nichts tun. Dein Passwort bleibt, wie es ist.',
    ],
    buttons: [{ label: 'Neues Passwort festlegen', href: `${appUrl()}/passwort-neu/${token}`, primary: true }],
  });
  return sendMail({ to: user.email, toName: user.name, subject: 'Hobbook: Neues Passwort festlegen', html, text });
}

/** @returns {Promise<'sent'|'failed'|'skipped'>} never throws */
export function sendVerifyMail(user, token) {
  const title = 'Bitte bestätige deine E-Mail-Adresse';
  const { html, text } = renderEmail({
    title,
    lines: [
      hello(user),
      'schön, dass du bei Hobbook dabei bist. Bestätige kurz, dass diese E-Mail-Adresse dir gehört. Der Link gilt 7 Tage.',
      'Du hast dich nicht bei Hobbook registriert? Dann kannst du diese E-Mail ignorieren.',
    ],
    buttons: [{ label: 'E-Mail-Adresse bestätigen', href: `${appUrl()}/email-bestaetigen/${token}`, primary: true }],
  });
  return sendMail({ to: user.email, toName: user.name, subject: 'Hobbook: Bitte bestätige deine E-Mail-Adresse', html, text });
}
