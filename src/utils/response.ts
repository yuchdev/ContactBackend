import type { PreparedResponse } from '../types';

/**
 * Prepared response templates
 */
export const responses: PreparedResponse = {
  success: {
    message: 'Thank you for your message. We will get back to you soon!',
    status: 200,
  },
  error: {
    validation: 'Invalid request data. Please check your input.',
    unauthorized: 'Unauthorized request.',
    rateLimit: 'Too many requests. Please try again later.',
    moderation: 'Message rejected by moderation.',
    internal: 'An error occurred. Please try again later.',
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
 * Create error response
 */
export function errorResponse(
  message: string,
  status = 400,
  corsOrigin?: string
): Response {
  return jsonResponse({ error: message }, status, corsOrigin);
}

/**
 * Create success response
 */
export function successResponse(
  message: string,
  corsOrigin?: string
): Response {
  return jsonResponse({ message }, 200, corsOrigin);
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
