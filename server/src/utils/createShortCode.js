import crypto from 'crypto';

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ALPHABET_LENGTH = 62;
// 256 - (256 % 62) = 248. Bytes >= 248 are rejected to guarantee an exact uniform distribution without modulo bias.
const MAX_VALID_BYTE = 248;

/**
 * Generates a random base62 string of specified length using rejection sampling
 * to avoid modulo bias.
 * @param {number} length Target code length (default: 7)
 * @returns {string} Unbiased random base62 string
 */
export function createShortCode(length = 7) {
  let result = '';
  while (result.length < length) {
    const remaining = length - result.length;
    // Sample extra bytes to minimize loop iterations
    const randomBytes = crypto.randomBytes(remaining * 2);
    for (let i = 0; i < randomBytes.length && result.length < length; i++) {
      const byte = randomBytes[i];
      if (byte < MAX_VALID_BYTE) {
        result += BASE62_ALPHABET[byte % ALPHABET_LENGTH];
      }
    }
  }
  return result;
}
