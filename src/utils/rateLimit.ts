import type { Env, RateLimitInfo } from '../types';

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

/**
 * Check rate limit for an IP address
 */
export async function checkRateLimit(
  ip: string,
  env: Env
): Promise<RateLimitInfo> {
  // If no KV binding, skip rate limiting
  if (!env.KV) {
    return { limited: false, remaining: -1, resetAt: 0 };
  }

  const maxRequests = parseInt(env.RATE_LIMIT_MAX || '10', 10);
  const windowSeconds = parseInt(env.RATE_LIMIT_WINDOW || '3600', 10);
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  
  const key = `ratelimit:${ip}`;
  const data = await env.KV.get(key, 'json') as { requests: number[]; resetAt: number } | null;

  if (!data) {
    // First request
    await env.KV.put(
      key,
      JSON.stringify({ requests: [now], resetAt: now + windowSeconds * 1000 }),
      { expirationTtl: windowSeconds }
    );
    return { limited: false, remaining: maxRequests - 1, resetAt: now + windowSeconds * 1000 };
  }

  // Filter out old requests outside the window
  const recentRequests = data.requests.filter(t => t > windowStart);
  recentRequests.push(now);

  if (recentRequests.length > maxRequests) {
    return { limited: true, remaining: 0, resetAt: data.resetAt };
  }

  // Update the request list
  await env.KV.put(
    key,
    JSON.stringify({ requests: recentRequests, resetAt: data.resetAt }),
    { expirationTtl: windowSeconds }
  );

  return {
    limited: false,
    remaining: maxRequests - recentRequests.length,
    resetAt: data.resetAt,
  };
}
