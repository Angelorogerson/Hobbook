import mongoose from 'mongoose';
import { ConnectEvent, Group } from '../models/index.js';
import { ACTIVE, leaveAndPromote } from './attendance.js';
import { afterPromotion } from './promotion.js';
import { notify } from './notify.js';

// Changing who runs a Stammspiel and who may take part.

/**
 * Hand a Stammspiel to another member. The previous organizer becomes co-host
 * (unless `keepPrevious` is false, e.g. when their account is deleted), and the
 * open games move to the new organizer.
 */
export async function transferGroup(group, toUserId, { keepPrevious = true, reason = '' } = {}) {
  const to = String(toUserId);
  const from = String(group.organizer);
  await Group.updateOne({ _id: group._id }, { $set: { organizer: to }, $pull: { coHosts: to } });
  if (keepPrevious && from !== to) await Group.updateOne({ _id: group._id }, { $addToSet: { coHosts: from } });
  await ConnectEvent.updateMany({ group: group._id, endAt: { $gt: new Date() } }, { $set: { creator: to } });
  await notify({
    users: [to],
    type: 'handover',
    title: `Du organisierst jetzt ${group.name}`,
    body: reason || 'Das Stammspiel wurde an dich übergeben. Du kannst es bearbeiten, erinnern und Termine absagen.',
    link: `/stammspiel/${group._id}`,
    group,
    important: true,
  });
}

/** Remove a member (optionally blocked from rejoining) and free their spot in the open game. */
export async function removeMember(group, userId, { block = false } = {}) {
  const uid = String(userId);
  await Group.updateOne(
    { _id: group._id },
    { $pull: { members: { user: uid }, coHosts: uid }, ...(block && { $addToSet: { blocked: uid } }) }
  );
  const now = new Date();
  const open = await ConnectEvent.find({ group: group._id, status: { $in: ACTIVE }, startAt: { $gt: now } }).lean();
  for (const e of open) {
    // Aggregation pipelines don't cast: pass a real ObjectId.
    const r = await leaveAndPromote(e._id, new mongoose.Types.ObjectId(uid), { now, requireMember: true });
    if (r) await afterPromotion(r.after, r.promoted, now);
  }
  await notify({
    users: [uid],
    type: 'removed',
    title: `Du bist nicht mehr bei ${group.name}`,
    body: 'Eine Organisator:in hat dich aus diesem Stammspiel entfernt.',
    group,
    email: false,
    important: true,
  });
}

export const isBlocked = (group, userId) => (group?.blocked || []).some((b) => String(b?._id || b) === String(userId));
