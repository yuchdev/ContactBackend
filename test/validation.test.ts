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
        secret: 'test-secret',
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Hello, this is a test message',
      };
      expect(validateContactForm(data)).toBe(true);
    });

    it('should reject form with missing required fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        // missing message and subject
        secret: 'test-secret',
      };
      expect(validateContactForm(data)).toBe(false);
    });

    it('should reject form with invalid email', () => {
      const data = {
        secret: 'test-secret',
        name: 'John Doe',
        email: 'invalid-email',
        subject: 'Test',
        message: 'Hello',
      };
      expect(validateContactForm(data)).toBe(false);
    });

    it('should reject form with empty name', () => {
      const data = {
        secret: 'test-secret',
        name: '   ',
        email: 'john@example.com',
        subject: 'Test',
        message: 'Hello',
      };
      expect(validateContactForm(data)).toBe(false);
    });

    it('should reject form with too long name', () => {
      const data = {
        secret: 'test-secret',
        name: 'A'.repeat(81),
        email: 'john@example.com',
        subject: 'Test',
        message: 'Hello',
      };
      expect(validateContactForm(data)).toBe(false);
    });

    it('should accept optional subject field', () => {
      const data = {
        secret: 'test-secret',
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Hello',
      };
      expect(validateContactForm(data)).toBe(true);
    });

    it('should reject subject that is too long', () => {
      const data = {
        secret: 'test-secret',
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'A'.repeat(121),
        message: 'Hello',
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
        secret: 'secret',
        name: 'John',
        email: 'john@example.com',
        subject: 'Test',
        message: 'Hello',
        website: '',
      } as ContactFormData;
      expect(checkHoneypot(data)).toBe(true);
    });

    it('should pass when honeypot is undefined', () => {
      const data = {
        secret: 'secret',
        name: 'John',
        email: 'john@example.com',
        subject: 'Test',
        message: 'Hello',
      } as ContactFormData;
      expect(checkHoneypot(data)).toBe(true);
    });

    it('should fail when honeypot is filled', () => {
      const data = {
        secret: 'secret',
        name: 'John',
        email: 'john@example.com',
        subject: 'Test',
        message: 'Hello',
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
        secret: 'secret',
        name: 'John',
        email: 'john@example.com',
        subject: 'Test',
        message: 'Hello World',
      } as ContactFormData;
      const key1 = createDedupeKey(data);
      const key2 = createDedupeKey(data);
      expect(key1).toBe(key2);
      expect(key1).toContain('john@example.com');
    });
  });
});
