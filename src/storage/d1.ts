import type { SubmissionRecord } from '../types';
import type { StorageBackend } from './interface';

/**
 * Implementation of StorageBackend using Cloudflare D1 (SQLite).
 * Provides persistent storage for submissions and uses them for rate limiting and deduplication.
 */
export class D1Storage implements StorageBackend {
  /**
   * Creates an instance of D1Storage.
   * @param {D1Database} db - The D1 database binding.
   */
  constructor(private db: D1Database) {}

  /**
   * Inserts a new submission record into the D1 database.
   * 
   * @param {SubmissionRecord} record - The submission record to save.
   * @returns {Promise<void>}
   */
  async saveSubmission(record: SubmissionRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO submissions (
          id, created_at, origin, ip_hash, dedupe_hash, name, email, subject, message,
          moderation_verdict, moderation_reason, github_issue_url, github_status, telegram_status, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        record.id,
        record.created_at,
        record.origin,
        record.ip_hash,
        record.dedupe_hash,
        record.name,
        record.email,
        record.subject,
        record.message,
        record.moderation_verdict,
        record.moderation_reason,
        record.github_issue_url,
        record.github_status,
        record.telegram_status,
        record.status
      )
      .run();
  }

  /**
   * Checks for duplicate submissions by searching for the dedupe hash in the submissions table.
   * 
   * @param {string} dedupeHash - The deduplication hash.
   * @param {number} ttlSeconds - Time-to-live window to check for duplicates.
   * @returns {Promise<boolean>} True if a duplicate is found.
   */
  async isDuplicate(dedupeHash: string, ttlSeconds: number): Promise<boolean> {
    const cutoffTime = Date.now() - ttlSeconds * 1000;
    const result = await this.db
      .prepare(
        `SELECT id FROM submissions 
         WHERE dedupe_hash = ? AND created_at > ?
         LIMIT 1`
      )
      .bind(dedupeHash, cutoffTime)
      .first();

    return result !== null;
  }

  /**
   * Calculates the rate limit count by counting previous submissions from the same IP hash.
   * 
   * @param {string} ipHash - The hash of the client's IP address.
   * @param {number} windowSeconds - The time window for rate limiting.
   * @returns {Promise<number>} Number of submissions in the window.
   */
  async getRateLimitCount(ipHash: string, windowSeconds: number): Promise<number> {
    const cutoffTime = Date.now() - windowSeconds * 1000;
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM submissions 
         WHERE ip_hash = ? AND created_at > ?`
      )
      .bind(ipHash, cutoffTime)
      .first<{ count: number }>();

    return result?.count || 0;
  }

  /**
   * No-op for D1, as rate limiting is handled by counting existing submission records.
   * 
   * @param {string} ipHash - The hash of the client's IP address.
   * @param {number} windowSeconds - The time window for rate limiting.
   * @returns {Promise<void>}
   */
  async incrementRateLimit(ipHash: string, windowSeconds: number): Promise<void> {
    // For D1, rate limiting is implicit through getRateLimitCount
    // No need to explicitly increment as submissions are counted
    void ipHash;
    void windowSeconds;
  }
}
