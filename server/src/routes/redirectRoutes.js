import { Router } from 'express';
import { handleRedirect } from '../controllers/redirectController.js';
import { redirectLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// 302 Redirection route with generous rate limit
router.get('/:code', redirectLimiter, handleRedirect);

export default router;
