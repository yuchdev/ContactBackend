/**
 * Check if origin is in CORS allowlist
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
 * Get allowed origin from request
 */
export function getAllowedOrigin(request: Request, allowlist: string): string | undefined {
  const origin = request.headers.get('Origin');
  if (origin && isOriginAllowed(origin, allowlist)) {
    return origin;
  }
  return undefined;
}
