import express from 'express';
import { getAlerts, createAlert, deleteAlert } from '../controllers/alertController.js';
import protect from '../middleware/auth.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimits.js';
import { createAlertSchema } from '../validation/alertSchemas.js';

// Search alerts ("Sag mir Bescheid"): mounted at /api/alerts.
const router = express.Router();

router.get('/', protect, getAlerts);
router.post('/', protect, writeLimiter, validate(createAlertSchema), createAlert);
router.delete('/:alertId', validateObjectId('alertId'), protect, writeLimiter, deleteAlert);

export default router;
