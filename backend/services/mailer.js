// Email delivery behind one small interface.
//   MAIL_DRIVER=brevo   → Brevo transactional API (free tier), needs BREVO_API_KEY + MAIL_FROM
//   MAIL_DRIVER=console → logs subject and recipient (default outside production)
//   MAIL_DRIVER=memory  → keeps messages in `outbox` (tests, E2E)
//   MAIL_DRIVER=off     → sends nothing
// Sending never throws: a failed email must not break a request or a job.

export const outbox = [];

function driver() {
  if (process.env.MAIL_DRIVER) return process.env.MAIL_DRIVER;
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'e2e') return 'memory';
  if (process.env.BREVO_API_KEY) return 'brevo';
  return process.env.NODE_ENV === 'production' ? 'off' : 'console';
}

export const emailEnabled = () => driver() !== 'off';

async function sendBrevo({ to, toName, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME || 'Hobbook' },
      to: [{ email: to, ...(toName && { name: toName }) }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}`);
}

/** @returns {Promise<'sent'|'failed'|'skipped'>} */
export async function sendMail(message) {
  const d = driver();
  try {
    if (d === 'off') return 'skipped';
    if (d === 'memory') {
      outbox.push({ ...message, at: new Date() });
      if (outbox.length > 500) outbox.shift();
      return 'sent';
    }
    if (d === 'console') {
      console.log(`[mail] → ${message.to}: ${message.subject}`);
      return 'sent';
    }
    if (d === 'brevo') {
      await sendBrevo(message);
      return 'sent';
    }
    return 'skipped';
  } catch (err) {
    console.error('[mail] failed:', err.message);
    return 'failed';
  }
}
