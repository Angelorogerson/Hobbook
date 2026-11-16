import express from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  joinEvent,
  leaveEvent,
  deleteEvent,
  getAllEvents,
  updateEvent,
  deleteEventAdmin,
  approveEvent,
  rejectEvent,
} from '../controllers/connectEventController.js';
import protect from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';

const router = express.Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);

// Protected routes
router.post('/', protect, createEvent);
router.put('/:id/join', protect, joinEvent);
router.put('/:id/leave', protect, leaveEvent);
router.delete('/:id', protect, deleteEvent);

// Admin routes
router.get('/admin/all', protect, isAdmin, getAllEvents);
router.put('/admin/:id', protect, isAdmin, updateEvent);
router.delete('/admin/:id', protect, isAdmin, deleteEventAdmin);
router.put('/admin/:id/approve', protect, isAdmin, approveEvent);
router.put('/admin/:id/reject', protect, isAdmin, rejectEvent);

export default router;
