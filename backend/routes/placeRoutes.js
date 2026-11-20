import express from 'express';
import { myPlaces } from '../controllers/placeController.js';
import protect from '../middleware/auth.js';

// Places a person used before (create form shortcuts): mounted at /api/places.
const router = express.Router();

router.get('/mine', protect, myPlaces);

export default router;
