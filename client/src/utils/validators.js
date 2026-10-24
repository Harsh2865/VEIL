const RESERVED_CODES = new Set([
  'api',
  'health',
  's',
  'admin',
  'favicon.ico',
  'robots.txt',
  'static',
  'assets',
  'login',
  'logout',
  'signup',
  'dashboard',
  'www',
  'null',
  'undefined',
]);

const CODE_REGEX = /^[A-Za-z0-9_-]{3,30}$/;

export function validateUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    return { valid: false, message: 'URL must be a string.' };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, message: 'Enter a valid HTTP or HTTPS URL.' };
  }

  if (trimmed.length > 2048) {
    return { valid: false, message: 'URL exceeds maximum length of 2048 characters.' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, message: 'Enter a valid HTTP or HTTPS URL (e.g. https://example.com).' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, message: 'Only HTTP and HTTPS URLs are supported.' };
  }

  if (!parsed.hostname || parsed.hostname.trim() === '') {
    return { valid: false, message: 'URL must have a valid host name.' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, message: 'URLs with embedded user credentials are not allowed.' };
  }

  return { valid: true, url: trimmed };
}

export function validateCustomCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: true, code: '' };
  }

  const trimmed = code.trim();
  if (trimmed === '') {
    return { valid: true, code: '' };
  }

  if (!CODE_REGEX.test(trimmed)) {
    return {
      valid: false,
      reason: 'invalid',
      message: 'Custom code must be 3-30 characters with letters, numbers, hyphens, and underscores only.',
    };
  }

  if (RESERVED_CODES.has(trimmed.toLowerCase())) {
    return {
      valid: false,
      reason: 'reserved',
      message: 'This custom code is a reserved system path and cannot be used.',
    };
  }

  return { valid: true, code: trimmed };
}
