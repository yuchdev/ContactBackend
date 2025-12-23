import type { ContactFormData } from '../types';
import { generateHash } from './hashing';

/**
 * Validates the structure and content of contact form data.
 * Checks for required fields and applies length and format constraints.
 * 
 * @param {unknown} data - The raw data to validate.
 * @returns {boolean} True if the data is a valid ContactFormData object.
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
 * Performs a basic regex-based email validation.
 * 
 * @param {string} email - The email address to validate.
 * @returns {boolean} True if the email format is valid.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Checks the honeypot field in the contact form data.
 * Bots often fill this hidden field, so it must be empty for a submission to be considered valid.
 * 
 * @param {ContactFormData} data - The contact form data.
 * @returns {boolean} True if the honeypot field is empty.
 */
export function checkHoneypot(data: ContactFormData): boolean {
  return !data.website || data.website.trim() === '';
}

/**
 * Validates the provided secret against the expected contact secret.
 * 
 * @param {string} provided - The secret provided in the request.
 * @param {string} expected - The expected secret from the environment.
 * @returns {boolean} True if the secrets match.
 */
export function validateSecret(provided: string, expected: string): boolean {
  return provided === expected;
}

/**
 * Creates a normalized deduplication key from the contact form data.
 * The key is used to generate a hash for identifying duplicate submissions within a 24-hour window.
 * 
 * @param {ContactFormData} data - The contact form data.
 * @returns {string} The normalized deduplication key.
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
 * Hashes an IP address with a salt for privacy.
 * 
 * @param {string} ip - The client's IP address.
 * @param {string} salt - A salt value (e.g., the contact secret).
 * @returns {Promise<string>} The hashed IP address.
 */
export async function hashIP(ip: string, salt: string): Promise<string> {
  const data = `${ip}:${salt}`;
  return generateHash(data);
}
