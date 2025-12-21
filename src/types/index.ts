/**
 * Environment variables and bindings available to the Worker
 */
export interface Env {
  // Secrets
  SHARED_SECRET: string;
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;

  // Configuration
  CORS_ALLOWLIST: string;
  MAX_BODY_SIZE?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW?: string;

  // Optional bindings
  KV?: KVNamespace;
  DB?: D1Database;
}

/**
 * Contact form submission data
 */
export interface ContactFormData {
  name: string;
  email: string;
  message: string;
  subject?: string;
  // Honeypot field - should be empty
  website?: string;
  // Shared secret for validation
  secret: string;
}

/**
 * Moderation result
 */
export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  confidence?: number;
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
