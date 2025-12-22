import type { Env } from './types';
import { getAllowedOrigin } from './utils/cors';
import { handleCorsPreFlight, rejectedResponse } from './utils/response';
import { handleContactSubmission } from './handlers/contact';

/**
 * Main Worker entry point
 */
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // CORS handling
        const corsOrigin = getAllowedOrigin(request, env.ALLOWED_ORIGINS || '');

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
                return rejectedResponse(403);
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
        return rejectedResponse(404, corsOrigin);
    },
};
