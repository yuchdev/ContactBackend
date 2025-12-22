import type { SubmissionRecord } from '../types';
import type { StorageBackend } from './interface';

/**
 * KV storage implementation (fallback when D1 is not available)
 */
export class KVStorage implements StorageBackend {
  constructor(private kv: KVNamespace) {}

  async saveSubmission(record: SubmissionRecord): Promise<void> {
    // Store submission in KV with TTL of 30 days
    const key = `submission:${record.id}`;
    await this.kv.put(key, JSON.stringify(record), {
      expirationTtl: 30 * 24 * 60 * 60, // 30 days
    });
  }

  async isDuplicate(dedupeHash: string, ttlSeconds: number): Promise<boolean> {
    const key = `dedupe:${dedupeHash}`;
    const exists = await this.kv.get(key);
    
    if (exists) {
      return true;
    }

    // Store dedupe marker
    await this.kv.put(key, '1', { expirationTtl: ttlSeconds });
    return false;
  }

  async getRateLimitCount(ipHash: string, windowSeconds: number): Promise<number> {
    const key = `ratelimit:${ipHash}`;
    const data = await this.kv.get(key, 'json') as { count: number; timestamp: number } | null;

    if (!data) {
      return 0;
    }

    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Check if the data is still within the window
    if (data.timestamp < windowStart) {
      return 0;
    }

    return data.count;
  }

  async incrementRateLimit(ipHash: string, windowSeconds: number): Promise<void> {
    const key = `ratelimit:${ipHash}`;
    const now = Date.now();
    const data = await this.kv.get(key, 'json') as { count: number; timestamp: number } | null;

    const windowStart = now - windowSeconds * 1000;
    
    if (!data || data.timestamp < windowStart) {
      // Start new window
      await this.kv.put(
        key,
        JSON.stringify({ count: 1, timestamp: now }),
        { expirationTtl: windowSeconds }
      );
    } else {
      // Increment within existing window
      await this.kv.put(
        key,
        JSON.stringify({ count: data.count + 1, timestamp: data.timestamp }),
        { expirationTtl: windowSeconds }
      );
    }
  }
}
