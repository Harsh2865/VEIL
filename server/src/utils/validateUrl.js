import { env } from '../config/env.js';

let appHostname = '';
try {
  appHostname = new URL(env.PUBLIC_SHORT_URL_BASE).hostname.toLowerCase();
} catch {
  appHostname = 'localhost';
}

/**
 * Validates an input URL according to system security constraints:
 * - Trimmed, non-empty, max 2048 characters
 * - Only http: or https:
 * - Must include a valid hostname
 * - Embedded credentials (user:pass@host) strictly disallowed
 * - Self-referencing short URLs (matching PUBLIC_SHORT_URL_BASE hostname) rejected
 *
 * @param {string} rawUrl Input URL string
 * @returns {{ valid: boolean, url?: string, message?: string }}
 */
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
    return { valid: false, message: 'Enter a valid HTTP or HTTPS URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, message: 'Only HTTP and HTTPS URLs are supported.' };
  }

  if (!parsed.hostname || parsed.hostname.trim() === '') {
    return { valid: false, message: 'Enter a valid HTTP or HTTPS URL.' };
  }

  // Reject embedded credentials (e.g. https://user:pass@example.com)
  if (parsed.username || parsed.password) {
    return { valid: false, message: 'URLs with embedded user credentials are not allowed.' };
  }

  // Reject self-referencing links to prevent redirection loops
  if (parsed.hostname.toLowerCase() === appHostname) {
    return { valid: false, message: 'Shortening URLs from this domain is not permitted.' };
  }

  return { valid: true, url: trimmed };
}
