import type { ContactFormData } from '../types';
import { generateHash } from './hashing';

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
    typeof form.secret !== 'string' ||
    typeof form.name !== 'string' ||
    typeof form.subject !== 'string' ||
    typeof form.message !== 'string'
  ) {
    return false;
  }

  // Validation rules per spec
  // name: 1-80 chars
  if (form.name.trim().length < 1 || form.name.length > 80) {
    return false;
  }

  // subject: 1-120 chars
  if (form.subject.trim().length < 1 || form.subject.length > 120) {
    return false;
  }

  // message: 1-5000 chars
  if (form.message.trim().length < 1 || form.message.length > 5000) {
    return false;
  }

  // email: optional, but if present must be valid
  if (form.email !== undefined) {
    if (typeof form.email !== 'string' || !isValidEmail(form.email)) {
      return false;
    }
  }

  // website: honeypot field, should be string if present
  if (form.website !== undefined && typeof form.website !== 'string') {
    return false;
  }

  // ts: optional timestamp, must be number if present
  if (form.ts !== undefined && typeof form.ts !== 'number') {
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
 * Create deduplication key from contact form data
 * Normalized to handle whitespace and case variations
 */
export function createDedupeKey(data: ContactFormData): string {
  // Normalize: trim, lowercase, collapse whitespace
  const normalizedEmail = (data.email || '').trim().toLowerCase();
  const normalizedSubject = data.subject.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedMessage = data.message.trim().toLowerCase().replace(/\s+/g, ' ');
  
  // Add day bucket for time-based deduplication
  const dayBucket = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  
  return `${normalizedEmail}|${normalizedSubject}|${normalizedMessage}|${dayBucket}`;
}

/**
 * Hash IP address with salt for privacy
 */
export async function hashIP(ip: string, salt: string): Promise<string> {
  const data = `${ip}:${salt}`;
  return generateHash(data);
}
