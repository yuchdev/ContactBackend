import type { ContactFormData } from '../types';

/**
 * Validate contact form data structure and required fields
 */
export function validateContactForm(data: unknown): data is ContactFormData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const form = data as Partial<ContactFormData>;

  // Required fields
  if (
    typeof form.name !== 'string' ||
    typeof form.email !== 'string' ||
    typeof form.message !== 'string' ||
    typeof form.secret !== 'string'
  ) {
    return false;
  }

  // Basic validation rules
  if (form.name.trim().length === 0 || form.name.length > 100) {
    return false;
  }

  if (!isValidEmail(form.email)) {
    return false;
  }

  if (form.message.trim().length === 0 || form.message.length > 5000) {
    return false;
  }

  // Optional subject field
  if (form.subject !== undefined && typeof form.subject !== 'string') {
    return false;
  }

  if (form.subject && form.subject.length > 200) {
    return false;
  }

  // Honeypot field should be string if present
  if (form.website !== undefined && typeof form.website !== 'string') {
    return false;
  }

  return true;
}

/**
 * Basic email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Check honeypot field (should be empty to pass)
 */
export function checkHoneypot(data: ContactFormData): boolean {
  return !data.website || data.website.trim() === '';
}

/**
 * Validate shared secret
 */
export function validateSecret(provided: string, expected: string): boolean {
  return provided === expected;
}

/**
 * Generate a hash for deduplication
 */
export async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create deduplication key from contact form data
 */
export function createDedupeKey(data: ContactFormData): string {
  return `${data.email}:${data.message.substring(0, 100)}`;
}
