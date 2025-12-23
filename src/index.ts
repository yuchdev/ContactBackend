import type { Env } from './types';
import { getAllowedOrigin } from './utils/cors';
import { handleCorsPreFlight, rejectedResponse } from './utils/response';
import { handleContactSubmission } from './handlers/contact';
import { logInfo, logError } from './log';

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

        try {
            // Explicitly reject non-POST and non-OPTIONS requests
            if (request.method !== 'POST' && request.method !== 'OPTIONS') {
                response = rejectedResponse(405, corsOrigin);
            }
            // Handle CORS preflight
            else if (request.method === 'OPTIONS') {
                if (corsOrigin) {
                    response = handleCorsPreFlight(corsOrigin);
                } else {
                    const origin = request.headers.get('Origin');
                    logInfo('cors_rejected', {
                        request_id: requestId,
                        path: url.pathname,
                        method: request.method,
                        origin: origin,
                        status: 403,
                        reason: 'CORS origin not allowed during preflight'
                    });
                    response = new Response(null, { status: 403 });
                }
            }
            // Route handling
            else if (url.pathname === '/api/contact' && request.method === 'POST') {
                // Check CORS
                if (!corsOrigin) {
                    const origin = request.headers.get('Origin');
                    logInfo('cors_rejected', {
                        request_id: requestId,
                        path: url.pathname,
                        method: request.method,
                        origin: origin,
                        status: 403,
                        reason: 'CORS origin not allowed'
                    });
                    response = rejectedResponse(403);
                } else {
                    response = await handleContactSubmission(request, env, corsOrigin);
                }
            }
            // 404 for other routes
            else {
                response = rejectedResponse(404, corsOrigin);
            }
        } catch (error) {
            logError('unhandled_exception', {
                request_id: requestId,
                path: url.pathname,
                method: request.method,
                origin: corsOrigin,
                error
            });
            response = rejectedResponse(500, corsOrigin);
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
