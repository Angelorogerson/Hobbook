import express from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getBookedSlots,
  getAllBookings,
} from '../controllers/bookingController.js';
import protect from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';

const router = express.Router();

// Specific routes (BEFORE wildcard :id)
router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.get('/venue/:venueId/slots', getBookedSlots);

// General routes
router.get('/', protect, isAdmin, getAllBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id/cancel', protect, cancelBooking);

export default router;
