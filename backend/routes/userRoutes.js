import express from 'express';
import { updateMe, updatePassword, getAllUsers, addFavorite, removeFavorite, getFavorites } from '../controllers/userController.js';
import protect from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';

const router = express.Router();

// Protected routes
router.put('/me', protect, updateMe);
router.put('/me/password', protect, updatePassword);

// Favorites routes
router.get('/me/favorites', protect, getFavorites);
router.post('/me/favorites', protect, addFavorite);
router.delete('/me/favorites', protect, removeFavorite);

// Admin only routes
router.get('/', protect, isAdmin, getAllUsers);

export default router;
