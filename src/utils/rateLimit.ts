import type { Env, RateLimitInfo } from '../types';

/**
 * Extracts the client's IP address from the request headers.
 * Uses the CF-Connecting-IP header provided by Cloudflare.
 * 
 * @param {Request} request - The incoming HTTP request.
 * @returns {string} The client's IP address or 'unknown'.
 */
export function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

/**
 * Checks the rate limit for a given IP address using Cloudflare KV.
 * 
 * @deprecated Rate limiting is now primarily handled through the StorageBackend.
 * This function is maintained for backward compatibility.
 * 
 * @param {string} ip - The client's IP address.
 * @param {Env} env - Environment variables containing the KV binding.
 * @returns {Promise<RateLimitInfo>} The rate limit status.
 */
export async function checkRateLimit(
  ip: string,
  env: Env
): Promise<RateLimitInfo> {
  // If no KV binding, skip rate limiting
  if (!env.KV) {
    return { limited: false, remaining: -1, resetAt: 0 };
  }

  const maxRequests = parseInt(env.RATE_LIMIT_PER_MINUTE || '10', 10);
  const windowSeconds = 60; // 1 minute window
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
