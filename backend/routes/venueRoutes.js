import express from 'express';
import { getVenues, getVenueById, createVenue, updateVenue, deleteVenue } from '../controllers/venueController.js';
import protect from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';

const router = express.Router();

// Admin only routes (BEFORE wildcard routes)
router.post('/', protect, isAdmin, createVenue);
router.put('/:id', protect, isAdmin, updateVenue);
router.delete('/:id', protect, isAdmin, deleteVenue);

// Public readonly routes (AFTER admin routes)
router.get('/', getVenues);
router.get('/:id', getVenueById);

export default router;
