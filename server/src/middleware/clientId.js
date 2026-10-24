const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware that extracts and validates the client ID from the X-Client-Id header.
 * The client ID must be a valid UUID v4.
 *
 * NOTE: The client ID is a convenience mechanism for associating link history
 * with anonymous browser sessions, not an authentication or security boundary.
 */
export function requireClientId(req, res, next) {
  const clientId = req.headers['x-client-id'];

  if (!clientId || typeof clientId !== 'string' || !UUID_V4_REGEX.test(clientId.trim())) {
    return res.status(400).json({
      error: {
        code: 'INVALID_CLIENT_ID',
        message: 'Missing or invalid X-Client-Id header. Must be a valid UUID v4.',
      },
    });
  }

  req.clientId = clientId.trim().toLowerCase();
  next();
}
