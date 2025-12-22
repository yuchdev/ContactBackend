/**
 * Environment variables and bindings available to the Worker
 */
export interface Env {
  // Mandatory Secrets
  CONTACT_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;

  // Telegram fallback secrets
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;

  // Configuration
  ALLOWED_ORIGINS: string;
  
  // Optional configuration
  USE_D1?: string;
  DEDUPE_TTL_SECONDS?: string;
  RATE_LIMIT_PER_MINUTE?: string;
  MAX_BODY_BYTES?: string;
  MODERATION_MODE?: string;
  AI_PROVIDER_KEY?: string;

  // Optional bindings
  KV?: KVNamespace;
  DB?: D1Database;
}

/**
 * Contact form submission data
 */
export interface ContactFormData {
  secret: string;
  name: string;
  email?: string;
  subject: string;
  message: string;
  website?: string; // Honeypot field - should be empty
  ts?: number; // Optional timestamp
}

/**
 * Moderation verdict types
 */
export type ModerationVerdict = 'ALLOW' | 'REVIEW' | 'BLOCK' | 'ERROR';

/**
 * Moderation result
 */
export interface ModerationResult {
  verdict: ModerationVerdict;
  reason?: string;
}

/**
 * Moderation strategy interface
 */
export interface ModerationStrategy {
  moderate(data: ContactFormData): Promise<ModerationResult>;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limited: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Prepared response templates
 */
export interface PreparedResponse {
  success: {
    message: string;
    status: number;
  };
  error: {
    validation: string;
    unauthorized: string;
    rateLimit: string;
    moderation: string;
    internal: string;
  };
}

/**
 * Submission record for storage
 */
export interface SubmissionRecord {
  id: string;
  created_at: number;
  origin: string | null;
  ip_hash: string;
  dedupe_hash: string;
  name: string;
  email: string | null;
  subject: string;
  message: string;
  moderation_verdict: string;
  moderation_reason: string | null;
  github_issue_url: string | null;
  github_status: string; // 'OK' | 'FAIL'
  telegram_status: string; // 'OK' | 'FAIL' | 'SKIP'
  status: string; // 'ACCEPTED' | 'QUEUED' | 'REJECTED'
}

/**
 * Notification result
 */
export interface NotificationResult {
  githubSuccess: boolean;
  githubIssueUrl: string | null;
  telegramSuccess: boolean;
  finalStatus: 'ok' | 'queued';
}
