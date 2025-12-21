import { describe, it, expect } from 'vitest';
import { isOriginAllowed } from '../src/utils/cors';

describe('CORS Utils', () => {
  describe('isOriginAllowed', () => {
    it('should allow origin in allowlist', () => {
      const allowlist = 'https://example.com,https://test.com';
      expect(isOriginAllowed('https://example.com', allowlist)).toBe(true);
      expect(isOriginAllowed('https://test.com', allowlist)).toBe(true);
    });

    it('should reject origin not in allowlist', () => {
      const allowlist = 'https://example.com,https://test.com';
      expect(isOriginAllowed('https://evil.com', allowlist)).toBe(false);
    });

    it('should reject null origin', () => {
      const allowlist = 'https://example.com';
      expect(isOriginAllowed(null, allowlist)).toBe(false);
    });

    it('should handle allowlist with whitespace', () => {
      const allowlist = 'https://example.com, https://test.com , https://demo.com';
      expect(isOriginAllowed('https://example.com', allowlist)).toBe(true);
      expect(isOriginAllowed('https://test.com', allowlist)).toBe(true);
      expect(isOriginAllowed('https://demo.com', allowlist)).toBe(true);
    });
  });
});
