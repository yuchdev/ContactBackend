import type { PreparedResponse } from '../types';

/**
 * Prepared response templates
 */
export const responses = {
  ok: {
    status: 'ok',
    message: 'Thank you for your message. We will get back to you soon!',
  },
  queued: {
    status: 'queued',
    message: 'Your message has been queued for processing.',
  },
  rejected: {
    status: 'rejected',
    message: 'Unable to process this request.',
  },
};

/**
 * Create JSON response with CORS headers
 */
export function jsonResponse(
  data: unknown,
  status = 200,
  corsOrigin?: string
): Response {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (corsOrigin) {
    headers['Access-Control-Allow-Origin'] = corsOrigin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

/**
 * Create rejected response (400 or 403)
 */
export function rejectedResponse(
  statusCode = 400,
  corsOrigin?: string
): Response {
  return jsonResponse(responses.rejected, statusCode, corsOrigin);
}

/**
 * Create ok response (200)
 */
export function okResponse(corsOrigin?: string): Response {
  return jsonResponse(responses.ok, 200, corsOrigin);
}

/**
 * Create queued response (202)
 */
export function queuedResponse(corsOrigin?: string): Response {
  return jsonResponse(responses.queued, 202, corsOrigin);
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreFlight(origin: string): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
