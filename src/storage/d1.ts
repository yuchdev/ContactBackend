import type { SubmissionRecord } from '../types';
import type { StorageBackend } from './interface';

/**
 * D1 database storage implementation
 */
export class D1Storage implements StorageBackend {
  constructor(private db: D1Database) {}

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

  async incrementRateLimit(ipHash: string, windowSeconds: number): Promise<void> {
    // For D1, rate limiting is implicit through getRateLimitCount
    // No need to explicitly increment as submissions are counted
    void ipHash;
    void windowSeconds;
  }
}
