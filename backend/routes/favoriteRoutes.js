import express from 'express';
import { getFavorites, addFavorite, removeFavorite } from '../controllers/favoriteController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.get('/', protect, getFavorites);

// Venue favorites
router.post('/venue/:venueId', protect, addFavorite);
router.delete('/venue/:venueId', protect, removeFavorite);

// Event favorites
router.post('/event/:eventId', protect, addFavorite);
router.delete('/event/:eventId', protect, removeFavorite);

export default router;
