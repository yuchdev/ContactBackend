import { describe, it, expect } from 'vitest';
import {
  validateContactForm,
  isValidEmail,
  checkHoneypot,
  validateSecret,
  createDedupeKey,
} from '../src/utils/validation';
import type { ContactFormData } from '../src/types';

describe('Validation Utils', () => {
  describe('validateContactForm', () => {
    it('should validate correct form data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello, this is a test message',
        secret: 'test-secret',
      };
      expect(validateContactForm(data)).toBe(true);
    });

    it('should reject form with missing required fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        // missing message
        secret: 'test-secret',
      };
      expect(validateContactForm(data)).toBe(false);
    });

    it('should reject form with invalid email', () => {
      const data = {
        name: 'John Doe',
        email: 'invalid-email',
        message: 'Hello',
        secret: 'test-secret',
      };
      expect(validateContactForm(data)).toBe(false);
    });

    it('should reject form with empty name', () => {
      const data = {
        name: '   ',
        email: 'john@example.com',
        message: 'Hello',
        secret: 'test-secret',
      };
      expect(validateContactForm(data)).toBe(false);
    });

    it('should reject form with too long name', () => {
      const data = {
        name: 'A'.repeat(101),
        email: 'john@example.com',
        message: 'Hello',
        secret: 'test-secret',
      };
      expect(validateContactForm(data)).toBe(false);
    });

    it('should accept optional subject field', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello',
        subject: 'Test Subject',
        secret: 'test-secret',
      };
      expect(validateContactForm(data)).toBe(true);
    });

    it('should reject subject that is too long', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello',
        subject: 'A'.repeat(201),
        secret: 'test-secret',
      };
      expect(validateContactForm(data)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid@domain')).toBe(false);
    });
  });

  describe('checkHoneypot', () => {
    it('should pass when honeypot is empty', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        message: 'Hello',
        secret: 'secret',
        website: '',
      } as ContactFormData;
      expect(checkHoneypot(data)).toBe(true);
    });

    it('should pass when honeypot is undefined', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        message: 'Hello',
        secret: 'secret',
      } as ContactFormData;
      expect(checkHoneypot(data)).toBe(true);
    });

    it('should fail when honeypot is filled', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        message: 'Hello',
        secret: 'secret',
        website: 'http://spam.com',
      } as ContactFormData;
      expect(checkHoneypot(data)).toBe(false);
    });
  });

  describe('validateSecret', () => {
    it('should validate matching secrets', () => {
      expect(validateSecret('secret123', 'secret123')).toBe(true);
    });

    it('should reject non-matching secrets', () => {
      expect(validateSecret('secret123', 'wrong')).toBe(false);
    });
  });

  describe('createDedupeKey', () => {
    it('should create consistent dedupe key', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        message: 'Hello World',
        secret: 'secret',
      } as ContactFormData;
      const key1 = createDedupeKey(data);
      const key2 = createDedupeKey(data);
      expect(key1).toBe(key2);
      expect(key1).toContain('john@example.com');
    });
  });
});
