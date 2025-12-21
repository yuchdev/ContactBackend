import type { Env, ContactFormData } from '../types';
import { validateContactForm, checkHoneypot, validateSecret } from '../utils/validation';
import { responses, errorResponse, successResponse } from '../utils/response';
import { getClientIP, checkRateLimit } from '../utils/rateLimit';
import { isDuplicate } from '../utils/deduplication';
import { getModerationStrategy } from '../moderation';
import { sendNotifications } from '../notifications';

/**
 * Handle contact form submission
 */
export async function handleContactSubmission(
  request: Request,
  env: Env,
  corsOrigin?: string
): Promise<Response> {
  try {
    // Check content type
    const contentType = request.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse(responses.error.validation, 400, corsOrigin);
    }

    // Check body size
    const maxSize = parseInt(env.MAX_BODY_SIZE || '1048576', 10);
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return errorResponse('Request body too large', 413, corsOrigin);
    }

    // Parse JSON
    let data: unknown;
    try {
      const text = await request.text();
      if (text.length > maxSize) {
        return errorResponse('Request body too large', 413, corsOrigin);
      }
      data = JSON.parse(text);
    } catch {
      return errorResponse(responses.error.validation, 400, corsOrigin);
    }

    // Validate structure
    if (!validateContactForm(data)) {
      return errorResponse(responses.error.validation, 400, corsOrigin);
    }

    // Validate shared secret
    if (!validateSecret(data.secret, env.SHARED_SECRET)) {
      return errorResponse(responses.error.unauthorized, 401, corsOrigin);
    }

    // Check honeypot
    if (!checkHoneypot(data)) {
      // Silently reject (looks like success to bots)
      return successResponse(responses.success.message, corsOrigin);
    }

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimit = await checkRateLimit(clientIP, env);
    if (rateLimit.limited) {
      return errorResponse(responses.error.rateLimit, 429, corsOrigin);
    }

    // Check for duplicates
    const duplicate = await isDuplicate(data, env);
    if (duplicate) {
      // Return success but don't process
      return successResponse(responses.success.message, corsOrigin);
    }

    // Moderation
    const moderationStrategy = getModerationStrategy('heuristic');
    const moderationResult = await moderationStrategy.moderate(data);
    if (!moderationResult.allowed) {
      console.log('Message rejected by moderation:', moderationResult.reason);
      return errorResponse(responses.error.moderation, 400, corsOrigin);
    }

    // Send notifications
    await sendNotifications(data, env);

    // Return success
    return successResponse(responses.success.message, corsOrigin);
  } catch (error) {
    console.error('Error handling contact submission:', error);
    return errorResponse(responses.error.internal, 500, corsOrigin);
  }
}
