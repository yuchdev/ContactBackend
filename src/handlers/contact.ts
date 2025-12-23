import type { Env, SubmissionRecord } from '../types';
import { parseConfig } from '../config';
import { validateContactForm, checkHoneypot, validateSecret, createDedupeKey, hashIP } from '../utils/validation';
import { generateHash, generateId } from '../utils/hashing';
import { rejectedResponse, okResponse, queuedResponse } from '../utils/response';
import { moderate } from '../moderation';
import { sendNotifications } from '../notifications';
import { getStorageBackend } from '../storage';
import { logInfo, logError } from '../log';

/**
 * Handle contact form submission
 */
export async function handleContactSubmission(
  request: Request,
  env: Env,
  corsOrigin?: string
): Promise<Response> {
  const requestId = request.headers.get('cf-ray') || 'unknown';
  const url = new URL(request.url);
  const logFields = {
    request_id: requestId,
    path: url.pathname,
    method: request.method,
    origin: corsOrigin,
  };

  try {
    // Parse configuration
    const config = parseConfig(env);

    // 1. Check method is POST (already handled by router)
    
    // 2. Check Content-Type
    const contentType = request.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      logInfo('submission_rejected', { 
        ...logFields, 
        status: 400, 
        reject_code: 'INVALID_CONTENT_TYPE',
        reason: 'Content-Type must be application/json'
      });
      return rejectedResponse(400, corsOrigin);
    }

    // 3. Check body size limit
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength, 10) > config.maxBodyBytes) {
      logInfo('submission_rejected', { 
        ...logFields, 
        status: 413, 
        reject_code: 'BODY_TOO_LARGE',
        reason: `Body exceeds limit of ${config.maxBodyBytes} bytes`
      });
      return rejectedResponse(413, corsOrigin);
    }

    // 4. Parse JSON (safe; handle errors)
    let data: unknown;
    try {
      const text = await request.text();
      if (text.length > config.maxBodyBytes) {
        logInfo('submission_rejected', { 
          ...logFields, 
          status: 413, 
          reject_code: 'BODY_TOO_LARGE',
          reason: `Body exceeds limit of ${config.maxBodyBytes} bytes`
        });
        return rejectedResponse(413, corsOrigin);
      }
      data = JSON.parse(text);
    } catch {
      logInfo('submission_rejected', { 
        ...logFields, 
        status: 400, 
        reject_code: 'INVALID_JSON',
        reason: 'Malformed JSON payload'
      });
      return rejectedResponse(400, corsOrigin);
    }

    // 5. Validate fields (schema)
    if (!validateContactForm(data)) {
      logInfo('submission_rejected', { 
        ...logFields, 
        status: 400, 
        reject_code: 'INVALID_SCHEMA',
        reason: 'Missing or invalid required fields (name, email, subject, message, secret)'
      });
      return rejectedResponse(400, corsOrigin);
    }

    // 6. Validate secret
    if (!validateSecret(data.secret, config.contactSecret)) {
      logInfo('submission_rejected', { 
        ...logFields, 
        status: 403, 
        reject_code: 'INVALID_SECRET',
        reason: 'Contact secret is invalid or missing'
      });
      return rejectedResponse(403, corsOrigin);
    }

    // 7. Check honeypot
    if (!checkHoneypot(data)) {
      logInfo('submission_honeypot', { ...logFields, status: 200 });
      // Silently accept (looks like success to bots)
      return okResponse(corsOrigin);
    }

    // 8. Compute IP hash
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipHash = await hashIP(clientIP, config.contactSecret);
    Object.assign(logFields, { ip_hash: ipHash });

    // 9. Get storage backend
    const storage = getStorageBackend(env);

    // 10. Rate limiting
    const rateLimitWindow = 60; // 1 minute window
    const count = await storage.getRateLimitCount(ipHash, rateLimitWindow);
    if (count >= config.rateLimitPerMinute) {
      logInfo('submission_rejected', { 
        ...logFields, 
        status: 429, 
        reject_code: 'RATE_LIMIT_EXCEEDED',
        reason: `Rate limit of ${config.rateLimitPerMinute} submissions per minute exceeded`
      });
      return rejectedResponse(429, corsOrigin);
    }

    // 11. Compute dedupe hash
    const dedupeKey = createDedupeKey(data);
    const dedupeHash = await generateHash(dedupeKey);
    Object.assign(logFields, { dedupe_hash: dedupeHash });

    // 12. Check for duplicates
    const isDuplicate = await storage.isDuplicate(dedupeHash, config.dedupeTtlSeconds);
    if (isDuplicate) {
      logInfo('submission_duplicate', { ...logFields, status: 200 });
      // Return success but don't process (idempotent)
      return okResponse(corsOrigin);
    }

    // 13. Moderation
    const moderationResult = await moderate(data, config.moderationMode);
    Object.assign(logFields, { moderation_verdict: moderationResult.verdict });

    if (moderationResult.verdict === 'BLOCK') {
      logInfo('submission_blocked', { ...logFields, status: 400, moderation_reason: moderationResult.reason });
      
      // Store rejected submission
      const rejectedRecord: SubmissionRecord = {
        id: generateId(),
        created_at: Date.now(),
        origin: corsOrigin || null,
        ip_hash: ipHash,
        dedupe_hash: dedupeHash,
        name: data.name,
        email: data.email || null,
        subject: data.subject,
        message: data.message,
        moderation_verdict: moderationResult.verdict,
        moderation_reason: moderationResult.reason || null,
        github_issue_url: null,
        github_status: 'FAIL',
        telegram_status: 'SKIP',
        status: 'REJECTED',
      };
      
      await storage.saveSubmission(rejectedRecord);
      return rejectedResponse(400, corsOrigin);
    }

    // 14. Increment rate limit counter
    await storage.incrementRateLimit(ipHash, rateLimitWindow);

    // 15. Send notifications (GitHub primary, Telegram fallback)
    const notificationResult = await sendNotifications(data, env, dedupeHash);

    // 16. Store submission
    const submissionRecord: SubmissionRecord = {
      id: generateId(),
      created_at: Date.now(),
      origin: corsOrigin || null,
      ip_hash: ipHash,
      dedupe_hash: dedupeHash,
      name: data.name,
      email: data.email || null,
      subject: data.subject,
      message: data.message,
      moderation_verdict: moderationResult.verdict,
      moderation_reason: moderationResult.reason || null,
      github_issue_url: notificationResult.githubIssueUrl || null,
      github_status: notificationResult.githubSuccess ? 'OK' : 'FAIL',
      telegram_status: notificationResult.telegramSuccess ? 'OK' : (notificationResult.githubSuccess ? 'SKIP' : 'FAIL'),
      status: notificationResult.finalStatus === 'ok' ? 'ACCEPTED' : 'QUEUED',
    };

    await storage.saveSubmission(submissionRecord);

    // 17. Return appropriate response
    if (notificationResult.finalStatus === 'ok') {
      logInfo('submission_accepted', { ...logFields, status: 200 });
      return okResponse(corsOrigin);
    } else {
      logInfo('submission_queued', { ...logFields, status: 202 });
      return queuedResponse(corsOrigin);
    }
  } catch (error) {
    try {
      logError('submission_error', { ...logFields, status: 500, error });
    } catch (logErr) {
      console.error('Failed to log submission error:', logErr);
    }
    return rejectedResponse(500, corsOrigin);
  }
}
