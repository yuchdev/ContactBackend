import type { SubmissionRecord } from '../types';

/**
 * Interface defining the methods required for a storage backend.
 * Implementations can use various storage technologies like Cloudflare KV, D1, or in-memory.
 */
export interface StorageBackend {
  /**
   * Persists a submission record to the storage.
   * 
   * @param {SubmissionRecord} record - The submission record to save.
   * @returns {Promise<void>}
   */
  saveSubmission(record: SubmissionRecord): Promise<void>;

  /**
   * Checks if a submission with the same deduplication hash already exists within the specified TTL.
   * 
   * @param {string} dedupeHash - The hash to check for duplicates.
   * @param {number} ttlSeconds - The time window in seconds to consider for duplicates.
   * @returns {Promise<boolean>} True if a duplicate is found, false otherwise.
   */
  isDuplicate(dedupeHash: string, ttlSeconds: number): Promise<boolean>;

  /**
   * Retrieves the number of submissions made from a specific IP hash within a given time window.
   * 
   * @param {string} ipHash - The hash of the client's IP address.
   * @param {number} windowSeconds - The time window in seconds.
   * @returns {Promise<number>} The number of submissions found.
   */
  getRateLimitCount(ipHash: string, windowSeconds: number): Promise<number>;

  /**
   * Increments the submission counter for a specific IP hash within a given time window.
   * 
   * @param {string} ipHash - The hash of the client's IP address.
   * @param {number} windowSeconds - The time window in seconds.
   * @returns {Promise<void>}
   */
  incrementRateLimit(ipHash: string, windowSeconds: number): Promise<void>;
}
