import { describe, it, expect, vi } from 'vitest';
import { validateUrl } from '../src/utils/validateUrl.js';
import { createShortCode } from '../src/utils/createShortCode.js';
import { validateCode } from '../src/utils/validateCode.js';
import { isReservedCode, RESERVED_CODES } from '../src/utils/reservedCodes.js';
import * as shortUrlService from '../src/services/shortUrlService.js';
import { ShortUrl } from '../src/models/ShortUrl.js';

describe('Phase 2 Unit Tests - Validation & Generation Utilities', () => {
  describe('validateUrl', () => {
    it('accepts valid http and https URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://sub.domain.org/path/to/resource?query=1&foo=bar#section',
        'https://github.com/nodejs/node',
      ];
      validUrls.forEach((url) => {
        const result = validateUrl(url);
        expect(result.valid).toBe(true);
        expect(result.url).toBe(url);
      });
    });

    it('trims leading and trailing whitespace', () => {
      const result = validateUrl('   https://example.com/test   ');
      expect(result.valid).toBe(true);
      expect(result.url).toBe('https://example.com/test');
    });

    it('rejects disallowed schemes (javascript:, data:, file:, ftp:)', () => {
      const invalidSchemes = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://ftp.example.com',
      ];
      invalidSchemes.forEach((url) => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
      });
    });

    it('rejects empty, null, or malformed inputs', () => {
      expect(validateUrl('').valid).toBe(false);
      expect(validateUrl('   ').valid).toBe(false);
      expect(validateUrl(null).valid).toBe(false);
      expect(validateUrl(undefined).valid).toBe(false);
      expect(validateUrl('not-a-valid-url').valid).toBe(false);
      expect(validateUrl('http://').valid).toBe(false);
    });

    it('rejects URLs longer than 2048 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2040);
      expect(longUrl.length).toBeGreaterThan(2048);
      const result = validateUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('2048');
    });

    it('rejects URLs containing embedded user credentials', () => {
      const credentialUrls = [
        'https://user:password@example.com/login',
        'http://admin:@test.com',
        'https://:secret@test.com',
      ];
      credentialUrls.forEach((url) => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.message).toContain('credentials');
      });
    });

    it('rejects self-referencing URLs matching the shortener host', () => {
      const result = validateUrl('http://localhost:5000/s/custom-link');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('this domain is not permitted');
    });
  });

  describe('createShortCode', () => {
    it('generates a 7-character string by default', () => {
      const code = createShortCode();
      expect(code).toHaveLength(7);
    });

    it('supports custom lengths', () => {
      expect(createShortCode(5)).toHaveLength(5);
      expect(createShortCode(10)).toHaveLength(10);
    });

    it('uses only base62 characters without illegal symbols', () => {
      const base62Regex = /^[0-9A-Za-z]+$/;
      for (let i = 0; i < 100; i++) {
        const code = createShortCode(7);
        expect(base62Regex.test(code)).toBe(true);
      }
    });
  });

  describe('reservedCodes and validateCode', () => {
    it('identifies reserved codes case-insensitively', () => {
      expect(isReservedCode('api')).toBe(true);
      expect(isReservedCode('API')).toBe(true);
      expect(isReservedCode('Admin')).toBe(true);
      expect(isReservedCode('favicon.ico')).toBe(true);
      expect(isReservedCode('FAVICON.ICO')).toBe(true);
      expect(isReservedCode('robots.txt')).toBe(true);
      expect(isReservedCode('www')).toBe(true);
      expect(isReservedCode('null')).toBe(true);
      expect(isReservedCode('undefined')).toBe(true);
      expect(isReservedCode('my-custom-link')).toBe(false);
    });

    it('all entries in RESERVED_CODES are recognized', () => {
      RESERVED_CODES.forEach((word) => {
        expect(isReservedCode(word)).toBe(true);
        expect(isReservedCode(word.toUpperCase())).toBe(true);
      });
    });

    it('validates custom codes within 3-30 characters with alphanumeric, _, -', () => {
      expect(validateCode('my-link').valid).toBe(true);
      expect(validateCode('Link_123').valid).toBe(true);
      expect(validateCode('a'.repeat(30)).valid).toBe(true);
      // Case is preserved
      expect(validateCode('MyLink').code).toBe('MyLink');
    });

    it('rejects codes that are too short, too long, or contain invalid characters', () => {
      expect(validateCode('ab').valid).toBe(false);
      expect(validateCode('a'.repeat(31)).valid).toBe(false);
      expect(validateCode('link with space').valid).toBe(false);
      expect(validateCode('link!@#').valid).toBe(false);
    });

    it('rejects reserved codes with reason "reserved"', () => {
      const result = validateCode('API');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('reserved');
    });
  });

  describe('shortUrlService - bounded retry and collision handling', () => {
    it('retries on duplicate key error 11000 and succeeds when collision resolves', async () => {
      let callCount = 0;
      vi.spyOn(ShortUrl, 'create').mockImplementation(async (data) => {
        callCount++;
        if (callCount === 1) {
          const err = new Error('E11000 duplicate key');
          err.code = 11000;
          throw err;
        }
        return {
          _id: '507f1f77bcf86cd799439011',
          originalUrl: data.originalUrl,
          shortCode: data.shortCode,
          label: null,
          clickCount: 0,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          lastClickedAt: null,
        };
      });

      const result = await shortUrlService.createUrlRecord({
        url: 'https://example.com/retry-test',
        clientId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      });

      expect(callCount).toBe(2);
      expect(result.originalUrl).toBe('https://example.com/retry-test');
      vi.restoreAllMocks();
    });

    it('throws SERVICE_UNAVAILABLE 503 when retry limit (5 retries) is exceeded', async () => {
      vi.spyOn(ShortUrl, 'create').mockImplementation(async () => {
        const err = new Error('E11000 duplicate key error');
        err.code = 11000;
        throw err;
      });

      await expect(
        shortUrlService.createUrlRecord({
          url: 'https://example.com/fail-test',
          clientId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        })
      ).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
      });

      vi.restoreAllMocks();
    });
  });
});
