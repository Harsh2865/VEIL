export class AppError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'API route not found.',
    },
  });
}

export function errorHandler(err, req, res, next) {
  // If headers are already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Known AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // JSON parsing error / syntax error from express.json
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON payload provided.',
      },
    });
  }

  // Request entity too large (payload limit exceeded)
  if (err.type === 'entity.too.large') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payload size exceeds the 10kb limit.',
      },
    });
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    return res.status(409).json({
      error: {
        code: 'CODE_TAKEN',
        message: 'The requested short code is already in use.',
      },
    });
  }

  // Mongoose CastError / ValidationError
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data provided.',
      },
    });
  }

  // Default internal server error - never leak stack traces or internal details
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal server error occurred.',
    },
  });
}
