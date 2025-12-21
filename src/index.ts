import type { Env } from './types';
import { getAllowedOrigin } from './utils/cors';
import { handleCorsPreFlight, errorResponse } from './utils/response';
import { handleContactSubmission } from './handlers/contact';

/**
 * Main Worker entry point
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS handling
    const corsOrigin = getAllowedOrigin(request, env.CORS_ALLOWLIST);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      if (corsOrigin) {
        return handleCorsPreFlight(corsOrigin);
      }
      return new Response(null, { status: 403 });
    }

    // Route handling
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      // Check CORS
      if (!corsOrigin) {
        return errorResponse('Origin not allowed', 403);
      }
      return handleContactSubmission(request, env, corsOrigin);
    }

    // Health check endpoint
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 404 for other routes
    return errorResponse('Not found', 404, corsOrigin);
  },
};
