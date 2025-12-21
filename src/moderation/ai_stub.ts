import type { ContactFormData, ModerationResult } from '../types';

/**
 * AI moderation stub - placeholder for future AI provider integration
 * 
 * TODO: Implement AI moderation using provider like:
 * - OpenAI Moderation API
 * - Perspective API
 * - Custom trained model
 * 
 * Required environment variables for AI moderation:
 * - AI_PROVIDER_KEY: API key for the AI provider
 * - AI_PROVIDER_URL: Optional custom endpoint URL
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
