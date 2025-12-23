/**
 * Checks if a given origin is present in the provided allowlist.
 * 
 * @param {string | null} origin - The origin to check.
 * @param {string} allowlist - A comma-separated list of allowed origins.
 * @returns {boolean} True if the origin is allowed.
 */
export function isOriginAllowed(origin: string | null, allowlist: string): boolean {
  if (!origin) {
    return false;
  }

  const allowedOrigins = allowlist
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0);

  return allowedOrigins.includes(origin);
}

/**
 * Retrieves the Origin header from the request and returns it if it's allowed.
 * 
 * @param {Request} request - The incoming HTTP request.
 * @param {string} allowlist - A comma-separated list of allowed origins.
 * @returns {string | undefined} The origin if allowed, otherwise undefined.
 */
export function getAllowedOrigin(request: Request, allowlist: string): string | undefined {
  const origin = request.headers.get('Origin');
  if (origin && isOriginAllowed(origin, allowlist)) {
    return origin;
  }
  return undefined;
}
