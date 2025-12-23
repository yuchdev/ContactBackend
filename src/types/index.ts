/**
 * Environment variables and bindings available to the Worker.
 * These are injected by Cloudflare at runtime based on wrangler.toml and secrets.
 */
export interface Env {
  /** Secret key for authenticating requests. */
  CONTACT_SECRET: string;
  /** Personal access token for GitHub API. */
  GITHUB_TOKEN: string;
  /** Owner of the GitHub repository. */
  GITHUB_OWNER: string;
  /** GitHub repository name. */
  GITHUB_REPO: string;

  /** Bot token for Telegram notifications (optional). */
  TELEGRAM_BOT_TOKEN?: string;
  /** Chat ID for Telegram notifications (optional). */
  TELEGRAM_CHAT_ID?: string;

  /** Comma-separated list of allowed CORS origins. */
  ALLOWED_ORIGINS: string;
  
  /** Flag to enable/disable D1 storage ('true' or 'false'). */
  USE_D1?: string;
  /** TTL for deduplication in seconds. */
  DEDUPE_TTL_SECONDS?: string;
  /** Number of allowed requests per minute. */
  RATE_LIMIT_PER_MINUTE?: string;
  /** Maximum size for request body. */
  MAX_BODY_BYTES?: string;
  /** Content moderation mode. */
  MODERATION_MODE?: string;
  /** API key for AI provider (optional). */
  AI_PROVIDER_KEY?: string;

  /** Cloudflare KV Namespace binding for rate limiting and deduplication. */
  KV?: KVNamespace;
  /** Cloudflare D1 Database binding for persistence. */
  DB?: D1Database;
}

/**
 * Data structure for contact form submissions.
 */
export interface ContactFormData {
  /** Secret to authenticate the submission. */
  secret: string;
  /** Name of the sender. */
  name: string;
  /** Email address of the sender (optional). */
  email?: string;
  /** Subject of the message. */
  subject: string;
  /** Content of the message. */
  message: string;
  /** Honeypot field - expected to be empty. */
  website?: string;
  /** Optional client-side timestamp. */
  ts?: number;
}

/**
 * Possible outcomes of a moderation check.
 */
export type ModerationVerdict = 'ALLOW' | 'REVIEW' | 'BLOCK' | 'ERROR';

/**
 * Represents the result of a moderation check.
 */
export interface ModerationResult {
  /** The verdict assigned to the content. */
  verdict: ModerationVerdict;
  /** Optional explanation for the verdict. */
  reason?: string;
}

/**
 * Interface defining a strategy for content moderation.
 */
export interface ModerationStrategy {
  /**
   * Moderates the given contact form data.
   * 
   * @param {ContactFormData} data - The submission data to moderate.
   * @returns {Promise<ModerationResult>} The result of the moderation.
   */
  moderate(data: ContactFormData): Promise<ModerationResult>;
}

/**
 * Information about the current rate limit status.
 */
export interface RateLimitInfo {
  /** Whether the request is rate limited. */
  limited: boolean;
  /** Number of remaining requests in the current window. */
  remaining: number;
  /** Timestamp when the rate limit window resets. */
  resetAt: number;
}

/**
 * Structure for predefined response messages and status codes.
 */
export interface PreparedResponse {
  /** Successful response details. */
  success: {
    message: string;
    status: number;
  };
  /** Error response details for various scenarios. */
  error: {
    validation: string;
    unauthorized: string;
    rateLimit: string;
    moderation: string;
    internal: string;
  };
}

/**
 * Represents a submission record stored in the database.
 */
export interface SubmissionRecord {
  /** Unique identifier for the submission. */
  id: string;
  /** Unix timestamp of when the submission was created. */
  created_at: number;
  /** Originating site of the request. */
  origin: string | null;
  /** Hash of the sender's IP address. */
  ip_hash: string;
  /** Hash used for deduplicating identical submissions. */
  dedupe_hash: string;
  /** Name of the sender. */
  name: string;
  /** Email address of the sender. */
  email: string | null;
  /** Subject of the message. */
  subject: string;
  /** Content of the message. */
  message: string;
  /** The moderation verdict applied to this submission. */
  moderation_verdict: string;
  /** Reason provided by the moderation check. */
  moderation_reason: string | null;
  /** URL of the created GitHub issue. */
  github_issue_url: string | null;
  /** Success status of GitHub notification ('OK' or 'FAIL'). */
  github_status: string;
  /** Success status of Telegram notification ('OK', 'FAIL', or 'SKIP'). */
  telegram_status: string;
  /** Final processing status ('ACCEPTED', 'QUEUED', or 'REJECTED'). */
  status: string;
}

/**
 * Result object summarizing the notification process.
 */
export interface NotificationResult {
  /** Whether the GitHub notification succeeded. */
  githubSuccess: boolean;
  /** URL of the created GitHub issue, if any. */
  githubIssueUrl: string | null;
  /** Whether the Telegram notification succeeded. */
  telegramSuccess: boolean;
  /** Final status of the submission processing. */
  finalStatus: 'ok' | 'queued';
}
