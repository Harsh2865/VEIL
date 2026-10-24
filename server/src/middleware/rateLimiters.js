import rateLimit from 'express-rate-limit';

function buildLimiter({ max, windowMs, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message,
        },
      });
    },
    skip: () => process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_IN_TEST !== 'true',
  });
}

// Create: strict, 20 per 15 min per IP
export const createUrlLimiter = buildLimiter({
  max: 20,
  windowMs: 15 * 60 * 1000,
  message: 'Too many URL shortening requests from this IP. Please try again later.',
});

// Availability check: moderate, 60 per 15 min per IP
export const availabilityLimiter = buildLimiter({
  max: 60,
  windowMs: 15 * 60 * 1000,
  message: 'Too many code availability checks. Please try again later.',
});

// List / Delete: moderate, 60 per 15 min per IP
export const listDeleteLimiter = buildLimiter({
  max: 60,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests. Please try again later.',
});

// Redirect: generous, 600 per 15 min per IP
export const redirectLimiter = buildLimiter({
  max: 600,
  windowMs: 15 * 60 * 1000,
  message: 'Too many redirect requests. Please try again later.',
});
