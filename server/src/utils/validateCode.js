import { isReservedCode } from './reservedCodes.js';

const CODE_REGEX = /^[A-Za-z0-9_-]{3,30}$/;

/**
 * Validates a custom short code string.
 * - Must be 3 to 30 characters of [A-Za-z0-9_-]
 * - Trimmed, case-sensitive
 * - Must not be a reserved word (case-insensitive)
 *
 * @param {string} code Custom code to validate
 * @returns {{ valid: boolean, code?: string, reason?: 'invalid' | 'reserved', message?: string }}
 */
export function validateCode(code) {
  if (typeof code !== 'string') {
    return {
      valid: false,
      reason: 'invalid',
      message: 'Short code must be a string.',
    };
  }

  const trimmed = code.trim();
  if (!CODE_REGEX.test(trimmed)) {
    return {
      valid: false,
      reason: 'invalid',
      message: 'Custom code must be 3-30 characters long and contain only letters, numbers, hyphens, and underscores.',
    };
  }

  if (isReservedCode(trimmed)) {
    return {
      valid: false,
      reason: 'reserved',
      message: 'This short code is a reserved system path and cannot be used.',
    };
  }

  return {
    valid: true,
    code: trimmed,
  };
}
