import type { SubmissionRecord } from '../types';
import type { StorageBackend } from './interface';

/**
 * In-memory implementation of StorageBackend.
 * Primarily used for testing and local development. Data is lost when the Worker instance is restarted.
 */
export class MemoryStorage implements StorageBackend {
  private submissions: Map<string, SubmissionRecord> = new Map();
  private dedupeHashes: Map<string, number> = new Map();
  private rateLimits: Map<string, { count: number; timestamp: number }> = new Map();

  /**
   * Saves a submission record to an in-memory Map.
   * 
   * @param {SubmissionRecord} record - The submission record to save.
   * @returns {Promise<void>}
   */
  async saveSubmission(record: SubmissionRecord): Promise<void> {
    this.submissions.set(record.id, record);
  }

  /**
   * Checks for duplicate submissions using an in-memory Map.
   * 
   * @param {string} dedupeHash - The deduplication hash.
   * @param {number} ttlSeconds - Time-to-live for the duplicate marker.
   * @returns {Promise<boolean>} True if duplicate is found.
   */
  async isDuplicate(dedupeHash: string, ttlSeconds: number): Promise<boolean> {
    const timestamp = this.dedupeHashes.get(dedupeHash);
    const now = Date.now();

    if (timestamp && now - timestamp < ttlSeconds * 1000) {
      return true;
    }

    this.dedupeHashes.set(dedupeHash, now);
    return false;
  }

  /**
   * Retrieves the rate limit count for an IP hash from an in-memory Map.
   * 
   * @param {string} ipHash - The hash of the client's IP address.
   * @param {number} windowSeconds - The rate limit window.
   * @returns {Promise<number>} Current count.
   */
  async getRateLimitCount(ipHash: string, windowSeconds: number): Promise<number> {
    const data = this.rateLimits.get(ipHash);
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    if (!data || data.timestamp < windowStart) {
      return 0;
    }

    return data.count;
  }

  /**
   * Increments the rate limit count for an IP hash in an in-memory Map.
   * 
   * @param {string} ipHash - The hash of the client's IP address.
   * @param {number} windowSeconds - The rate limit window.
   * @returns {Promise<void>}
   */
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
   * Clears all in-memory data. Useful for resetting state between tests.
   */
  clear(): void {
    this.submissions.clear();
    this.dedupeHashes.clear();
    this.rateLimits.clear();
  }
}
