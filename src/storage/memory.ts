import type { SubmissionRecord } from '../types';
import type { StorageBackend } from './interface';

/**
 * In-memory storage implementation (for testing)
 */
export class MemoryStorage implements StorageBackend {
  private submissions: Map<string, SubmissionRecord> = new Map();
  private dedupeHashes: Map<string, number> = new Map();
  private rateLimits: Map<string, { count: number; timestamp: number }> = new Map();

  async saveSubmission(record: SubmissionRecord): Promise<void> {
    this.submissions.set(record.id, record);
  }

  async isDuplicate(dedupeHash: string, ttlSeconds: number): Promise<boolean> {
    const timestamp = this.dedupeHashes.get(dedupeHash);
    const now = Date.now();

    if (timestamp && now - timestamp < ttlSeconds * 1000) {
      return true;
    }

    this.dedupeHashes.set(dedupeHash, now);
    return false;
  }

  async getRateLimitCount(ipHash: string, windowSeconds: number): Promise<number> {
    const data = this.rateLimits.get(ipHash);
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    if (!data || data.timestamp < windowStart) {
      return 0;
    }

    return data.count;
  }

  async incrementRateLimit(ipHash: string, windowSeconds: number): Promise<void> {
    const now = Date.now();
    const data = this.rateLimits.get(ipHash);
    const windowStart = now - windowSeconds * 1000;

    if (!data || data.timestamp < windowStart) {
      this.rateLimits.set(ipHash, { count: 1, timestamp: now });
    } else {
      this.rateLimits.set(ipHash, { count: data.count + 1, timestamp: data.timestamp });
    }
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.submissions.clear();
    this.dedupeHashes.clear();
    this.rateLimits.clear();
  }
}
