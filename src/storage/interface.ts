import type { SubmissionRecord } from '../types';

/**
 * Storage interface for submissions
 */
export interface StorageBackend {
  /**
   * Save a submission record
   */
  saveSubmission(record: SubmissionRecord): Promise<void>;

  /**
   * Check if a submission with the given dedupe hash exists within TTL
   */
  isDuplicate(dedupeHash: string, ttlSeconds: number): Promise<boolean>;

  /**
   * Get count of submissions from IP within time window (for rate limiting)
   */
  getRateLimitCount(ipHash: string, windowSeconds: number): Promise<number>;

  /**
   * Increment rate limit counter for IP
   */
  incrementRateLimit(ipHash: string, windowSeconds: number): Promise<void>;
}
