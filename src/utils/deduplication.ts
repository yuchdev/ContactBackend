import type { Env, ContactFormData } from '../types';
import { generateHash } from './hashing';
import { createDedupeKey } from './validation';

/**
 * Checks if a contact form submission is a duplicate using Cloudflare KV.
 * 
 * @param {ContactFormData} data - The submission data.
 * @param {Env} env - Environment variables containing the KV binding.
 * @returns {Promise<boolean>} True if the submission is a duplicate.
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
