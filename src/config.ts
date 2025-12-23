import type { Env } from './types';

/**
 * Configuration interface containing the application's runtime settings.
 */
export interface Config {
  /** Secret key used for authenticating contact form submissions. */
  contactSecret: string;
  /** List of origins allowed to make CORS requests. */
  allowedOrigins: string[];
  /** GitHub personal access token for creating issues. */
  githubToken: string;
  /** Owner of the GitHub repository where issues will be created. */
  githubOwner: string;
  /** Name of the GitHub repository where issues will be created. */
  githubRepo: string;
  /** Telegram Bot API token for sending notifications. */
  telegramBotToken?: string;
  /** Telegram chat ID where notifications will be sent. */
  telegramChatId?: string;
  /** Whether to use Cloudflare D1 for persistent storage. */
  useD1: boolean;
  /** Time-to-live in seconds for deduplicating submissions. */
  dedupeTtlSeconds: number;
  /** Maximum number of submissions allowed per minute per IP. */
  rateLimitPerMinute: number;
  /** Maximum size of the request body in bytes. */
  maxBodyBytes: number;
  /** Mode for content moderation ('heuristic', 'ai', or 'off'). */
  moderationMode: 'heuristic' | 'ai' | 'off';
}

/**
 * Parses and validates environment variables into a structured configuration object.
 * 
 * @param {Env} env - The environment variables provided by Cloudflare Workers.
 * @returns {Config} The parsed configuration object.
 * @throws {Error} If mandatory fields are missing or validation fails.
 */
export function parseConfig(env: Env): Config {
  // Validate mandatory fields
  const missingFields: string[] = [];
  if (!env.CONTACT_SECRET) missingFields.push('CONTACT_SECRET');
  if (!env.GITHUB_TOKEN) missingFields.push('GITHUB_TOKEN');
  if (!env.GITHUB_OWNER) missingFields.push('GITHUB_OWNER');
  if (!env.GITHUB_REPO) missingFields.push('GITHUB_REPO');
  if (!env.ALLOWED_ORIGINS) missingFields.push('ALLOWED_ORIGINS');

  if (missingFields.length > 0) {
    throw new Error(`Missing mandatory environment variables: ${missingFields.join(', ')}`);
  }

  // Parse allowed origins
  const allowedOrigins = env.ALLOWED_ORIGINS
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0);

  if (allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must contain at least one origin');
  }

  // Parse optional fields with defaults
  const useD1 = env.USE_D1 !== undefined 
    ? env.USE_D1.toLowerCase() === 'true' 
    : !!env.DB;

  const dedupeTtlSeconds = parseInt(env.DEDUPE_TTL_SECONDS || '86400', 10);
  const rateLimitPerMinute = parseInt(env.RATE_LIMIT_PER_MINUTE || '10', 10);
  const maxBodyBytes = parseInt(env.MAX_BODY_BYTES || '8192', 10);
  
  const moderationMode = (env.MODERATION_MODE || 'heuristic') as 'heuristic' | 'ai' | 'off';
  if (!['heuristic', 'ai', 'off'].includes(moderationMode)) {
    throw new Error('MODERATION_MODE must be one of: heuristic, ai, off');
  }

  return {
    contactSecret: env.CONTACT_SECRET,
    allowedOrigins,
    githubToken: env.GITHUB_TOKEN,
    githubOwner: env.GITHUB_OWNER,
    githubRepo: env.GITHUB_REPO,
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    telegramChatId: env.TELEGRAM_CHAT_ID,
    useD1,
    dedupeTtlSeconds,
    rateLimitPerMinute,
    maxBodyBytes,
    moderationMode,
  };
}
