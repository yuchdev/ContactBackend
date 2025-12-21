import type { Env } from './types';

/**
 * Configuration interface with parsed values
 */
export interface Config {
  contactSecret: string;
  allowedOrigins: string[];
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  useD1: boolean;
  dedupeTtlSeconds: number;
  rateLimitPerMinute: number;
  maxBodyBytes: number;
  moderationMode: 'heuristic' | 'ai' | 'off';
}

/**
 * Parse and validate environment configuration
 */
export function parseConfig(env: Env): Config {
  // Validate mandatory fields
  if (!env.CONTACT_SECRET) {
    throw new Error('CONTACT_SECRET is required');
  }
  if (!env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is required');
  }
  if (!env.GITHUB_OWNER) {
    throw new Error('GITHUB_OWNER is required');
  }
  if (!env.GITHUB_REPO) {
    throw new Error('GITHUB_REPO is required');
  }
  if (!env.ALLOWED_ORIGINS) {
    throw new Error('ALLOWED_ORIGINS is required');
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
