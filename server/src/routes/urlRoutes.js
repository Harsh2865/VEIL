import { Router } from 'express';
import {
  createUrl,
  listUrls,
  deleteUrl,
  checkAvailability,
} from '../controllers/urlController.js';
import { requireClientId } from '../middleware/clientId.js';
import {
  createUrlLimiter,
  listDeleteLimiter,
  availabilityLimiter,
} from '../middleware/rateLimiters.js';

const router = Router();

// URL management routes requiring client ID
router.post('/urls', createUrlLimiter, requireClientId, createUrl);
router.get('/urls', listDeleteLimiter, requireClientId, listUrls);
router.delete('/urls/:id', listDeleteLimiter, requireClientId, deleteUrl);

// Public custom code availability advisory check
router.get('/codes/:code/available', availabilityLimiter, checkAvailability);

export default router;
