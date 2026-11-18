import { ConnectEvent } from '../models/index.js';
import { ACTIVE, leaveAndPromote } from './attendance.js';
import { notify } from './notify.js';
import { appUrl, signLink } from '../utils/linkToken.js';
import { formatClock, formatWhen } from '../utils/time.js';

// Moving up from the waiting list.
// - More than CONFIRM_WINDOW before kick-off: automatic, you're simply in.
// - Within the window: you hold the spot but must confirm within CONFIRM_MINUTES
//   (never later than kick-off). Otherwise it passes to the next person.

export const CONFIRM_WINDOW_MS = 6 * 3600 * 1000;
export const CONFIRM_MINUTES = 30;

const confirmButtons = (userId, event) => {
  const exp = new Date(event.startAt).getTime();
  const link = (a) => `${appUrl()}/antwort/${signLink({ t: 'answer', u: String(userId), e: String(event._id), a, exp })}`;
  return [
    { label: 'Ich komme', href: link('in'), primary: true },
    { label: 'Doch nicht', href: link('out') },
  ];
};

/** Tell the promoted person; within the window they must confirm first. */
export async function afterPromotion(event, promoted, now = new Date()) {
  if (!promoted) return;
  const start = new Date(event.startAt).getTime();
  const link = `/events/${event._id}`;
  const group = event.group || undefined;

  if (start - now.getTime() > CONFIRM_WINDOW_MS) {
    await notify({
      users: [promoted],
      type: 'promoted',
      title: `Du bist nachgerückt: ${event.title}`,
      body: `${formatWhen(event.startAt, event.timezone)}. Ein Platz ist frei geworden – du bist jetzt dabei.`,
      link,
      event,
      group,
      important: true,
    });
    return;
  }

  const confirmBy = new Date(Math.min(now.getTime() + CONFIRM_MINUTES * 60 * 1000, start));
  await ConnectEvent.updateOne({ _id: event._id }, { $pull: { pendingPromotions: { user: promoted } } });
  await ConnectEvent.updateOne({ _id: event._id }, { $push: { pendingPromotions: { user: promoted, confirmBy } } });
  const until = formatClock(confirmBy, event.timezone);
  await notify({
    users: [promoted],
    type: 'promoted',
    title: `Platz frei: ${event.title} – bitte bis ${until} bestätigen`,
    body: `Ein Platz ist frei geworden (${formatWhen(event.startAt, event.timezone)}). Bestätige bis ${until} Uhr, sonst geht er an die nächste Person.`,
    link,
    event,
    group,
    important: true,
    email: (u) => ({
      lines: [`${formatWhen(event.startAt, event.timezone)} · ${event.location?.placeName || ''}`, `Bitte bestätige bis ${until} Uhr.`],
      buttons: confirmButtons(u._id, event),
    }),
  });
}

/** The person said "Ich komme": the spot is theirs for good. Returns true when there was something to confirm. */
export async function confirmSpot(eventId, uid) {
  const r = await ConnectEvent.updateOne({ _id: eventId, 'pendingPromotions.user': uid }, { $pull: { pendingPromotions: { user: uid } } });
  return r.modifiedCount > 0;
}

/** Job step: unconfirmed spots pass to the next person on the waiting list. */
export async function expirePromotions(now = new Date()) {
  let n = 0;
  const events = await ConnectEvent.find({ 'pendingPromotions.confirmBy': { $lte: now } }).lean();
  for (const e of events) {
    for (const p of e.pendingPromotions.filter((x) => x.confirmBy <= now)) {
      const claimed = await ConnectEvent.updateOne(
        { _id: e._id, pendingPromotions: { $elemMatch: { user: p.user, confirmBy: { $lte: now } } } },
        { $pull: { pendingPromotions: { user: p.user } } }
      );
      if (!claimed.modifiedCount) continue;
      if (!ACTIVE.includes(e.status) || new Date(e.startAt) <= now) continue;
      const result = await leaveAndPromote(e._id, p.user, { now, record: true, late: false, allowCreator: true });
      if (!result) continue;
      n += 1;
      await notify({
        users: [p.user],
        type: 'spot_passed',
        title: `Platz weitergegeben: ${e.title}`,
        body: 'Du hast den freien Platz nicht rechtzeitig bestätigt. Er ging an die nächste Person.',
        link: `/events/${e._id}`,
        event: e,
        group: e.group || undefined,
        email: false,
      });
      await afterPromotion(result.after, result.promoted, now);
    }
  }
  return n;
}
