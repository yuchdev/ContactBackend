import type { Env } from '../types';
import type { StorageBackend } from './interface';
import { D1Storage } from './d1';
import { KVStorage } from './kv';
import { MemoryStorage } from './memory';

export type { StorageBackend } from './interface';
export { D1Storage } from './d1';
export { KVStorage } from './kv';
export { MemoryStorage } from './memory';

/**
 * Get the appropriate storage backend based on environment
 */
export function getStorageBackend(env: Env): StorageBackend {
  // Prefer D1 if available and USE_D1 is not explicitly false
  const useD1 = env.USE_D1 !== undefined 
    ? env.USE_D1.toLowerCase() === 'true' 
    : !!env.DB;

  if (useD1 && env.DB) {
    return new D1Storage(env.DB);
  }

  // Fall back to KV if available
  if (env.KV) {
    return new KVStorage(env.KV);
  }

  // Use memory storage for testing/development
  return new MemoryStorage();
}
