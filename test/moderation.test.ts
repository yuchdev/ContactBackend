import { describe, it, expect } from 'vitest';
import { getModerationStrategy } from '../src/moderation';
import type { ContactFormData } from '../src/types';

describe('Moderation', () => {
  describe('StubModeration', () => {
    it('should allow all messages', async () => {
      const strategy = getModerationStrategy('stub');
      const data: ContactFormData = {
        name: 'Test',
        email: 'test@example.com',
        message: 'Any message',
        secret: 'secret',
      };
      const result = await strategy.moderate(data);
      expect(result.allowed).toBe(true);
    });
  });

  describe('HeuristicModeration', () => {
    it('should allow legitimate messages', async () => {
      const strategy = getModerationStrategy('heuristic');
      const data: ContactFormData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'I would like to inquire about your services.',
        secret: 'secret',
      };
      const result = await strategy.moderate(data);
      expect(result.allowed).toBe(true);
    });

    it('should reject messages with spam keywords', async () => {
      const strategy = getModerationStrategy('heuristic');
      const data: ContactFormData = {
        name: 'Spammer',
        email: 'spam@example.com',
        message: 'Buy viagra now! Limited offer!',
        secret: 'secret',
      };
      const result = await strategy.moderate(data);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeTruthy();
    });

    it('should reject messages that are too short', async () => {
      const strategy = getModerationStrategy('heuristic');
      const data: ContactFormData = {
        name: 'Test',
        email: 'test@example.com',
        message: 'Hi',
        secret: 'secret',
      };
      const result = await strategy.moderate(data);
      expect(result.allowed).toBe(false);
    });

    it('should reject messages with too many links', async () => {
      const strategy = getModerationStrategy('heuristic');
      const data: ContactFormData = {
        name: 'Spammer',
        email: 'spam@example.com',
        message: 'Check out https://link1.com and https://link2.com and https://link3.com',
        secret: 'secret',
      };
      const result = await strategy.moderate(data);
      expect(result.allowed).toBe(false);
    });

    it('should allow messages with one or two links', async () => {
      const strategy = getModerationStrategy('heuristic');
      const data: ContactFormData = {
        name: 'John',
        email: 'john@example.com',
        message: 'Please check my portfolio at https://mysite.com for more information.',
        secret: 'secret',
      };
      const result = await strategy.moderate(data);
      expect(result.allowed).toBe(true);
    });

    it('should reject messages with excessive caps', async () => {
      const strategy = getModerationStrategy('heuristic');
      const data: ContactFormData = {
        name: 'Shouter',
        email: 'shout@example.com',
        message: 'HELLO THIS IS A VERY IMPORTANT MESSAGE PLEASE READ',
        secret: 'secret',
      };
      const result = await strategy.moderate(data);
      expect(result.allowed).toBe(false);
    });
  });
});
