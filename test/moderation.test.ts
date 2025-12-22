import { describe, it, expect } from 'vitest';
import { moderate } from '../src/moderation';
import type { ContactFormData } from '../src/types';

describe('Moderation', () => {
  describe('Off mode', () => {
    it('should allow all messages', async () => {
      const data: ContactFormData = {
        secret: 'secret',
        name: 'Test',
        email: 'test@example.com',
        subject: 'Test',
        message: 'Any message',
      };
      const result = await moderate(data, 'off');
      expect(result.verdict).toBe('ALLOW');
    });
  });

  describe('HeuristicModeration', () => {
    it('should allow legitimate messages', async () => {
      const data: ContactFormData = {
        secret: 'secret',
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Inquiry',
        message: 'I would like to inquire about your services.',
      };
      const result = await moderate(data, 'heuristic');
      expect(result.verdict).toBe('ALLOW');
    });

    it('should reject messages with spam keywords', async () => {
      const data: ContactFormData = {
        secret: 'secret',
        name: 'Spammer',
        email: 'spam@example.com',
        subject: 'Offer',
        message: 'Buy viagra now! Limited offer!',
      };
      const result = await moderate(data, 'heuristic');
      expect(result.verdict).toBe('BLOCK');
      expect(result.reason).toBeTruthy();
    });

    it('should reject messages that are too short', async () => {
      const data: ContactFormData = {
        secret: 'secret',
        name: 'Test',
        email: 'test@example.com',
        subject: 'Hi',
        message: 'Hi',
      };
      const result = await moderate(data, 'heuristic');
      expect(result.verdict).toBe('BLOCK');
    });

    it('should reject messages with too many links', async () => {
      const data: ContactFormData = {
        secret: 'secret',
        name: 'Spammer',
        email: 'spam@example.com',
        subject: 'Links',
        message: 'Check out https://link1.com and https://link2.com and https://link3.com',
      };
      const result = await moderate(data, 'heuristic');
      expect(result.verdict).toBe('REVIEW');
    });

    it('should allow messages with one or two links', async () => {
      const data: ContactFormData = {
        secret: 'secret',
        name: 'John',
        email: 'john@example.com',
        subject: 'Portfolio',
        message: 'Please check my portfolio at https://mysite.com for more information.',
      };
      const result = await moderate(data, 'heuristic');
      expect(result.verdict).toBe('ALLOW');
    });

    it('should review messages with excessive caps', async () => {
      const data: ContactFormData = {
        secret: 'secret',
        name: 'Shouter',
        email: 'shout@example.com',
        subject: 'IMPORTANT',
        message: 'HELLO THIS IS A VERY IMPORTANT MESSAGE PLEASE READ',
      };
      const result = await moderate(data, 'heuristic');
      expect(result.verdict).toBe('REVIEW');
    });
  });
});
