/**
 * Predefined response templates for consistent API messaging.
 */
export const responses = {
  /** Success response template. */
  ok: {
    status: 'ok',
    message: 'Thank you for your message. We will get back to you soon!',
  },
  /** Queued response template (used when processing is delayed). */
  queued: {
    status: 'queued',
    message: 'Your message has been queued for processing.',
  },
  /** Rejection response template for invalid or disallowed requests. */
  rejected: {
    status: 'rejected',
    message: 'Unable to process this request.',
  },
};

/**
 * Creates a JSON response with the specified data, status code, and optional CORS headers.
 * 
 * @param {unknown} data - The data to include in the response body.
 * @param {number} [status=200] - The HTTP status code.
 * @param {string} [corsOrigin] - The allowed CORS origin.
 * @returns {Response} The constructed Response object.
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
 * Creates a rejected response (e.g., 400 Bad Request, 403 Forbidden).
 * 
 * @param {number} [statusCode=400] - The HTTP status code.
 * @param {string} [corsOrigin] - The allowed CORS origin.
 * @returns {Response} The constructed Response object.
 */
export function rejectedResponse(
  statusCode = 400,
  corsOrigin?: string
): Response {
  return jsonResponse(responses.rejected, statusCode, corsOrigin);
}

/**
 * Creates a successful OK response (200).
 * 
 * @param {string} [corsOrigin] - The allowed CORS origin.
 * @returns {Response} The constructed Response object.
 */
export function okResponse(corsOrigin?: string): Response {
  return jsonResponse(responses.ok, 200, corsOrigin);
}

/**
 * Creates a queued response (202), indicating the request was accepted but not yet fully processed.
 * 
 * @param {string} [corsOrigin] - The allowed CORS origin.
 * @returns {Response} The constructed Response object.
 */
export function queuedResponse(corsOrigin?: string): Response {
  return jsonResponse(responses.queued, 202, corsOrigin);
}

/**
 * Handles CORS preflight (OPTIONS) requests.
 * 
 * @param {string} origin - The origin to allow in the response headers.
 * @returns {Response} The constructed Response object.
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
