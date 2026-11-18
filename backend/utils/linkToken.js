import crypto from 'node:crypto';

// Signed, stateless links for emails: answer a game or mute a Stammspiel
// without signing in. The payload holds ids only; the signature uses a key
// derived from LINK_SECRET (or JWT_SECRET), so a changed secret voids all links.

const key = () => {
  const base = process.env.LINK_SECRET || process.env.JWT_SECRET;
  if (!base) throw new Error('LINK_SECRET/JWT_SECRET missing');
  return crypto.createHmac('sha256', base).update('hobbook-email-links-v1').digest();
};

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (body) => b64(crypto.createHmac('sha256', key()).update(body).digest()).slice(0, 32);

/**
 * @param {{ t: 'answer'|'mute', u: string, e?: string, g?: string, a?: 'in'|'out', exp: number }} payload
 *   exp: expiry as epoch ms
 */
export function signLink(payload) {
  const body = b64(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** The payload, or null when tampered, malformed or expired. */
export function verifyLink(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload.exp !== 'number' || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Public base URL of the web app, used in emails and push messages. */
export function appUrl() {
  const first = (process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
  return first.replace(/\/$/, '');
}
