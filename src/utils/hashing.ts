/**
 * Generates a SHA-256 hash from the provided string using the Web Crypto API.
 * 
 * @param {string} data - The input string to hash.
 * @returns {Promise<string>} A promise that resolves to the hex-encoded hash string.
 */
export async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a unique identifier based on the current timestamp and a random string.
 * 
 * @returns {string} The generated unique ID.
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}
