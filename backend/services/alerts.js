import { User } from '../models/index.js';
import { notify } from './notify.js';
import { formatWhen, WEEKDAYS } from '../utils/time.js';

// Search alerts ("Sag mir Bescheid"): people who searched a city and found
// nothing are told when the first public event or Stammspiel appears there.

const MAX_RECIPIENTS = 200;
const TITLE_MAX = 200; // Notification.title

const clip = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** Work started from a request without being awaited (tests wait for it with alertsSettled). */
const inFlight = new Set();
function track(promise) {
  inFlight.add(promise);
  promise.finally(() => inFlight.delete(promise));
  return promise;
}
export const alertsSettled = () => Promise.all([...inFlight]);

/** Active people with an alert for this city and (all sports or this sport), without `exceptId`. */
async function recipients({ cityKey, sport, exceptId }) {
  if (!cityKey) return [];
  const users = await User.find({
    _id: { $ne: exceptId },
    isActive: { $ne: false },
    alerts: { $elemMatch: { cityKey, sport: { $in: [null, sport] } } },
  })
    .select('_id')
    .limit(MAX_RECIPIENTS)
    .lean();
  return users.map((u) => u._id);
}

const emailFor = (body, city) => () => ({
  lines: [body, `Du bekommst diese Nachricht, weil du einen Such-Alarm für ${city} hast. Du kannst ihn in deinem Profil entfernen.`],
});

/**
 * A NEW public single event: one notice per person with a matching alert.
 * Never rejects, so it can be called from a request without awaiting it.
 * @returns {Promise<number>} people told
 */
export function notifyAlertsForEvent(event) {
  return track(
    (async () => {
      try {
        if (!event || event.visibility !== 'public' || event.group) return 0;
        const city = event.location?.city || '';
        const users = await recipients({ cityKey: event.location?.cityKey, sport: event.sport, exceptId: event.creator });
        if (!users.length) return 0;
        const body = `${formatWhen(event.startAt, event.timezone)} · ${event.location?.placeName || ''}`;
        return await notify({
          users,
          type: 'new_event',
          title: clip(`Neu in ${city}: ${event.title}`, TITLE_MAX),
          body,
          link: `/events/${event._id}`,
          event,
          email: emailFor(body, city),
        });
      } catch (err) {
        console.error('Such-Alarme (Event) fehlgeschlagen:', err?.message || err);
        return 0;
      }
    })()
  );
}

/**
 * A NEW public Stammspiel. The weekly games generated from it do not alert again.
 * Never rejects, so it can be called from a request without awaiting it.
 * @returns {Promise<number>} people told
 */
export function notifyAlertsForGroup(group) {
  return track(
    (async () => {
      try {
        if (!group || group.visibility !== 'public' || group.active === false) return 0;
        const city = group.location?.city || '';
        const users = await recipients({ cityKey: group.location?.cityKey, sport: group.sport, exceptId: group.organizer });
        if (!users.length) return 0;
        const body = `Jeden ${WEEKDAYS[group.weekday]}, ${group.startTime} Uhr · ${group.location?.placeName || ''}`;
        // No `group` here: the people told are not members, so there is nothing to mute.
        return await notify({
          users,
          type: 'new_event',
          title: clip(`Neues Stammspiel in ${city}: ${group.name}`, TITLE_MAX),
          body,
          link: `/s/${group.inviteCode}`,
          email: emailFor(body, city),
        });
      } catch (err) {
        console.error('Such-Alarme (Stammspiel) fehlgeschlagen:', err?.message || err);
        return 0;
      }
    })()
  );
}
