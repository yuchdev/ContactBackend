import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/types';

describe('Contact API Integration', () => {
  let env: Env;

  beforeEach(() => {
    env = {
      CONTACT_SECRET: 'test-secret',
      GITHUB_TOKEN: 'ghp_test_token',
      GITHUB_OWNER: 'testowner',
      GITHUB_REPO: 'testrepo',
      ALLOWED_ORIGINS: 'https://example.com,https://test.com',
      DEDUPE_TTL_SECONDS: '86400',
      RATE_LIMIT_PER_MINUTE: '10',
      MAX_BODY_BYTES: '8192',
      MODERATION_MODE: 'heuristic',
    };
  });

  describe('Health Check Rejection', () => {
    it('should reject health check with 405', async () => {
      const request = new Request('https://example.com/health', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(405);
    });
  });

  describe('CORS Preflight', () => {
    it('should handle OPTIONS request from allowed origin', async () => {
      const request = new Request('https://example.com/api/contact', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
        },
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });

    it('should reject OPTIONS request from disallowed origin', async () => {
      const request = new Request('https://example.com/api/contact', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil.com',
        },
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/contact', () => {
    it('should reject request without Origin', async () => {
      const request = new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
          secret: 'test-secret',
        }),
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(403);
    });

    it('should reject request from disallowed origin', async () => {
      const request = new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://evil.com',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
          secret: 'test-secret',
        }),
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(403);
    });

    it('should reject request with invalid JSON', async () => {
      const request = new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: 'invalid json',
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(400);
    });

    it('should reject request with missing required fields', async () => {
      const request = new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          // missing subject and message
          secret: 'test-secret',
        }),
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(400);
    });

    it('should reject request with invalid secret', async () => {
      const request = new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          subject: 'Test Subject',
          message: 'Test message',
          secret: 'wrong-secret',
        }),
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(403); // 403 is returned for invalid secret (forbidden)
    });

    it('should silently accept request with filled honeypot', async () => {
      const request = new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          name: 'Bot',
          email: 'bot@example.com',
          subject: 'Spam Subject',
          message: 'Spam message',
          website: 'http://spam.com',
          secret: 'test-secret',
        }),
      });

      const response = await worker.fetch(request, env);
      // Should return 200 to not alert bots
      expect(response.status).toBe(200);
    });

    it('should accept valid request without notifications', async () => {
      const request = new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          subject: 'Test Subject',
          message: 'This is a valid test message',
          secret: 'test-secret',
        }),
      });

      const response = await worker.fetch(request, env);
      // Returns 202 because GitHub fails in test environment and falls back to Telegram
      expect([200, 202]).toContain(response.status);
      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('status');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });

    it('should reject request with spam content', async () => {
      const request = new Request('https://example.com/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
        },
        body: JSON.stringify({
          name: 'Spammer',
          email: 'spam@example.com',
          subject: 'Spam Subject',
          message: 'Buy viagra now at http://example.com',
          secret: 'test-secret',
        }),
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('rejected');
    });
  });

  describe('Method Rejection for unknown routes', () => {
    it('should return 405 for unknown routes with GET', async () => {
      const request = new Request('https://example.com/unknown', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(405);
    });
  });
});
