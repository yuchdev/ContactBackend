import type { Env } from './types';
import { getAllowedOrigin } from './utils/cors';
import { handleCorsPreFlight, rejectedResponse } from './utils/response';
import { handleContactSubmission } from './handlers/contact';
import { logInfo } from './log';

/**
 * Main Worker entry point
 */
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const requestId = request.headers.get('cf-ray') || 'unknown';

        // CORS handling
        const corsOrigin = getAllowedOrigin(request, env.ALLOWED_ORIGINS || '');

        let response: Response;

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            if (corsOrigin) {
                response = handleCorsPreFlight(corsOrigin);
            } else {
                response = new Response(null, { status: 403 });
            }
        }
        // Route handling
        else if (url.pathname === '/api/contact' && request.method === 'POST') {
            // Check CORS
            if (!corsOrigin) {
                response = rejectedResponse(403);
            } else {
                response = await handleContactSubmission(request, env, corsOrigin);
            }
        }
        // Health check endpoint
        else if (url.pathname === '/health' && request.method === 'GET') {
            response = new Response(JSON.stringify({ status: 'ok' }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        // 404 for other routes
        else {
            response = rejectedResponse(404, corsOrigin);
        }

        // Summary log
        logInfo('request_summary', {
            request_id: requestId,
            path: url.pathname,
            method: request.method,
            origin: corsOrigin,
            status: response.status,
        });

        return response;
    },
};
