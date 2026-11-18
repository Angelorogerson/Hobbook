import { ConnectEvent } from '../models/index.js';

// Atomic attendance changes shared by single events (join/leave/waitlist) and
// Stammspiel games (answer in/out). Every change is one findOneAndUpdate with
// an aggregation pipeline, so capacity can never be exceeded under concurrency.

export const ACTIVE = ['open', 'full'];
const H = 3600 * 1000;

const list = (field) => ({ $ifNull: [`$${field}`, []] });
const without = (field, uid) => ({ $filter: { input: list(field), cond: { $ne: ['$$this', uid] } } });
const statusStage = {
  $set: { status: { $cond: [{ $gte: [{ $size: '$participants' }, '$maxParticipants'] }, 'full', 'open'] } },
};
// `late` may be an expression: a late "out" only counts when the person held a spot.
const responsesWith = (uid, answer, now, late) => ({
  $concatArrays: [
    { $filter: { input: list('responses'), cond: { $ne: ['$$this.user', uid] } } },
    [{ user: { $literal: uid }, answer: { $literal: answer }, at: { $literal: now }, late }],
  ],
});

/** A change to "out" counts as late after the answer deadline (single events: 3 h before start). */
export function isLate(event, now = new Date()) {
  const cutoff = event.deadlineAt ? new Date(event.deadlineAt) : new Date(new Date(event.startAt).getTime() - 3 * H);
  return now > cutoff;
}

/**
 * Take a spot, or (when `waitIfFull`) a place on the waiting list.
 * @returns the updated event (lean) or null when the event can't be joined at all
 */
export async function joinOrWait(eventId, uid, { now = new Date(), waitIfFull = false, record = false } = {}) {
  const filter = { _id: eventId, status: { $in: ACTIVE }, startAt: { $gt: now }, decision: { $ne: 'off' } };
  if (!waitIfFull) {
    filter.$or = [{ participants: uid }, { $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] } }];
  }
  const inList = { $in: [uid, '$participants'] };
  const room = { $lt: [{ $size: '$participants' }, '$maxParticipants'] };
  const pipeline = [
    { $set: { _in: inList, _room: room } },
    {
      $set: {
        participants: { $cond: [{ $and: [{ $not: ['$_in'] }, '$_room'] }, { $concatArrays: ['$participants', [uid]] }, '$participants'] },
        waitlist: {
          $cond: [
            { $or: ['$_in', '$_room'] },
            without('waitlist', uid),
            { $cond: [{ $in: [uid, list('waitlist')] }, list('waitlist'), { $concatArrays: [list('waitlist'), [uid]] }] },
          ],
        },
        ...(record && { responses: responsesWith(uid, 'in', now, false) }),
      },
    },
    statusStage,
    { $unset: ['_in', '_room'] },
  ];
  return ConnectEvent.findOneAndUpdate(filter, pipeline, { new: true }).lean();
}

/**
 * Give up a spot (or a waiting-list place). The first person on the waiting
 * list moves up in the same atomic step.
 * @returns {{ before, after, promoted: string|null }|null}
 */
export async function leaveAndPromote(
  eventId,
  uid,
  { now = new Date(), record = false, late = false, allowCreator = false, requireMember = !record } = {}
) {
  const filter = { _id: eventId, status: { $in: ACTIVE }, startAt: { $gt: now } };
  if (requireMember) filter.$or = [{ participants: uid }, { waitlist: uid }];
  if (!allowCreator) filter.creator = { $ne: uid };

  const pipeline = [
    {
      $set: {
        _was: { $in: [uid, '$participants'] },
        participants: without('participants', uid),
        waitlist: without('waitlist', uid),
        pendingPromotions: { $filter: { input: list('pendingPromotions'), cond: { $ne: ['$$this.user', uid] } } },
      },
    },
    {
      $set: {
        _promote: {
          $cond: [
            { $and: ['$_was', { $gt: [{ $size: '$waitlist' }, 0] }, { $lt: [{ $size: '$participants' }, '$maxParticipants'] }] },
            { $arrayElemAt: ['$waitlist', 0] },
            null,
          ],
        },
      },
    },
    {
      $set: {
        participants: { $cond: [{ $ne: ['$_promote', null] }, { $concatArrays: ['$participants', ['$_promote']] }, '$participants'] },
        waitlist: {
          $cond: [{ $ne: ['$_promote', null] }, { $slice: ['$waitlist', 1, { $max: [1, { $size: '$waitlist' }] }] }, '$waitlist'],
        },
        ...(record && { responses: responsesWith(uid, 'out', now, { $and: [late, '$_was'] }) }),
      },
    },
    statusStage,
    { $unset: ['_was', '_promote'] },
  ];

  const before = await ConnectEvent.findOneAndUpdate(filter, pipeline, { new: false }).lean();
  if (!before) return null;
  const after = await ConnectEvent.findById(eventId).lean();
  const had = new Set(before.participants.map(String));
  const promoted = after.participants.map(String).find((p) => !had.has(p)) || null;
  return { before, after, promoted };
}

/** Where the viewer stands: 'in' | 'waiting' | 'out' | null (no answer yet). */
export function standing(event, uid) {
  const id = String(uid);
  if ((event.participants || []).some((p) => String(p._id || p) === id)) return 'in';
  if ((event.waitlist || []).some((p) => String(p._id || p) === id)) return 'waiting';
  const r = (event.responses || []).find((x) => String(x.user?._id || x.user) === id);
  return r?.answer === 'out' ? 'out' : null;
}
