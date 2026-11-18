import { ConnectEvent } from '../models/index.js';

// Reliability from facts only: games a person was signed up for when they
// ended, minus no-shows marked by a host (and not disputed), plus late
// cancellations. Shown to others only once someone has 3+ games.

export const MIN_GAMES_TO_SHOW = 3;
const YEAR = 365 * 24 * 3600 * 1000;

export async function reliabilityFor(userId, now = new Date()) {
  const since = new Date(now.getTime() - YEAR);
  const games = await ConnectEvent.find({
    participants: userId,
    status: { $ne: 'cancelled' },
    endAt: { $lt: now, $gte: since },
  })
    .select('noShows')
    .lean();
  const noShows = games.filter((g) => (g.noShows || []).some((n) => String(n.user) === String(userId) && !n.disputed)).length;
  const lateCancels = await ConnectEvent.countDocuments({
    startAt: { $gte: since, $lt: now },
    responses: { $elemMatch: { user: userId, answer: 'out', late: true } },
  });
  return {
    games: games.length,
    attended: games.length - noShows,
    noShows,
    lateCancels,
    enoughData: games.length >= MIN_GAMES_TO_SHOW,
  };
}
