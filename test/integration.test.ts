import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/types';

describe('Contact API Integration', () => {
  let env: Env;

  beforeEach(() => {
    env = {
      SHARED_SECRET: 'test-secret',
      CORS_ALLOWLIST: 'https://example.com,https://test.com',
      MAX_BODY_SIZE: '1048576',
      RATE_LIMIT_MAX: '10',
      RATE_LIMIT_WINDOW: '3600',
    };
  });

  describe('Health Check', () => {
    it('should return 200 for health check', async () => {
      const request = new Request('https://example.com/health', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ status: 'ok' });
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
          // missing message
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
          message: 'Test message',
          secret: 'wrong-secret',
        }),
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(401);
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
          message: 'This is a valid test message',
          secret: 'test-secret',
        }),
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message');
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
          message: 'Buy viagra now at http://example.com',
          secret: 'test-secret',
        }),
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const request = new Request('https://example.com/unknown', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(404);
    });
  });
});
