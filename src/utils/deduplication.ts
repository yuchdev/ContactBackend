import type { Env, ContactFormData } from '../types';
import { generateHash } from './hashing';
import { createDedupeKey } from './validation';

/**
 * Check if a submission is a duplicate
 */
export async function isDuplicate(
  data: ContactFormData,
  env: Env
): Promise<boolean> {
  // If no KV binding, skip deduplication
  if (!env.KV) {
    return false;
  }

  const dedupeKey = createDedupeKey(data);
  const hash = await generateHash(dedupeKey);
  const key = `dedupe:${hash}`;

  const exists = await env.KV.get(key);
  if (exists) {
    return true;
  }

  // Store for 24 hours
  await env.KV.put(key, '1', { expirationTtl: 86400 });
  return false;
}
