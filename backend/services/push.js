import webpush from 'web-push';
import { User } from '../models/index.js';

// Web push (an extra channel next to in-app and email, never the only one).
// Enabled when VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set; generate them once with
//   npx web-push generate-vapid-keys

let configured = null;
export function pushEnabled() {
  if (configured !== null) return configured;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  configured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
  if (configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://hobbook.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
  return configured;
}

export const pushPublicKey = () => (pushEnabled() ? process.env.VAPID_PUBLIC_KEY : null);

/** Send one message to every device of the given users; drops expired subscriptions. */
export async function sendPush(userIds, payload) {
  if (!pushEnabled() || !userIds.length) return 0;
  const users = await User.find({ _id: { $in: userIds }, 'pushSubscriptions.0': { $exists: true } })
    .select('+pushSubscriptions')
    .lean();
  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(
    users.flatMap((u) =>
      u.pushSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, { TTL: 6 * 3600 });
          sent += 1;
        } catch (err) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await User.updateOne({ _id: u._id }, { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } });
          }
        }
      })
    )
  );
  return sent;
}
