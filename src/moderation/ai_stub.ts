import type { ContactFormData, ModerationResult } from '../types';

/**
 * A stub for AI-based content moderation.
 * This function currently serves as a placeholder for future integration with AI moderation services.
 * 
 * @param {ContactFormData} data - The submission data to moderate.
 * @returns {Promise<ModerationResult>} A promise resolving to 'ALLOW' with a notice that AI moderation is not configured.
 * 
 * @todo Implement AI moderation using a service like OpenAI Moderation API or Perspective API.
 */
export async function moderateAI(data: ContactFormData): Promise<ModerationResult> {
  void data;
  
  console.warn('AI moderation is not implemented. Falling back to ALLOW.');
  
  // TODO: Implement actual AI moderation logic here
  // Example structure:
  // 1. Prepare request to AI provider
  // 2. Send content for analysis
  // 3. Parse response
  // 4. Return appropriate verdict
  
  return {
    verdict: 'ALLOW',
    reason: 'AI moderation not configured',
  };
}
