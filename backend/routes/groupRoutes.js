import express from 'express';
import {
  createGroup,
  getMyGroups,
  getGroup,
  joinGroup,
  leaveGroup,
  muteGroup,
  updateGroup,
  skipNext,
  remindNow,
  setCoHost,
  endGroup,
  listGroups,
  transferOwnership,
  removeMemberHandler,
  unblockMember,
} from '../controllers/groupController.js';
import protect from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimits.js';
import {
  createGroupSchema,
  updateGroupSchema,
  muteSchema,
  coHostSchema,
  endGroupSchema,
  transferSchema,
  removeMemberSchema,
  listGroupsQuerySchema,
} from '../validation/groupSchemas.js';

const router = express.Router();

router.post('/', protect, writeLimiter, validate(createGroupSchema), createGroup);
router.get('/', optionalAuth, validate(listGroupsQuerySchema, 'query'), listGroups);
router.get('/mine', protect, getMyGroups);
router.get('/:key', optionalAuth, getGroup);
router.patch('/:id', validateObjectId(), protect, writeLimiter, validate(updateGroupSchema), updateGroup);
router.delete('/:id', validateObjectId(), protect, writeLimiter, validate(endGroupSchema), endGroup);
router.post('/:id/join', validateObjectId(), protect, writeLimiter, joinGroup);
router.post('/:id/leave', validateObjectId(), protect, writeLimiter, leaveGroup);
router.post('/:id/mute', validateObjectId(), protect, writeLimiter, validate(muteSchema), muteGroup);
router.post('/:id/skip', validateObjectId(), protect, writeLimiter, skipNext);
router.post('/:id/remind', validateObjectId(), protect, writeLimiter, remindNow);
router.post('/:id/transfer', validateObjectId(), protect, writeLimiter, validate(transferSchema), transferOwnership);
router.post('/:id/members/:userId/remove', validateObjectId(), validateObjectId('userId'), protect, writeLimiter, validate(removeMemberSchema), removeMemberHandler);
router.post('/:id/members/:userId/unblock', validateObjectId(), validateObjectId('userId'), protect, writeLimiter, unblockMember);
router.post('/:id/cohosts', validateObjectId(), protect, writeLimiter, validate(coHostSchema), setCoHost);

export default router;
