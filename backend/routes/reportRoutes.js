import express from 'express';
import { createReport, listReports, updateReport } from '../controllers/reportController.js';
import protect from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';
import { validate, validateObjectId } from '../middleware/validate.js';
import { reportLimiter } from '../middleware/rateLimits.js';
import { createReportSchema, updateReportSchema, listReportsQuerySchema } from '../validation/eventSchemas.js';

const router = express.Router();

router.post('/', protect, reportLimiter, validate(createReportSchema), createReport);
router.get('/', protect, isAdmin, validate(listReportsQuerySchema, 'query'), listReports);
router.patch('/:id', validateObjectId(), protect, isAdmin, validate(updateReportSchema), updateReport);

export default router;
