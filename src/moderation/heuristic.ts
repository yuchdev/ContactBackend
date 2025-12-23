import type { ContactFormData, ModerationResult } from '../types';

/**
 * Performs heuristic-based moderation using basic spam detection rules.
 * Rules include keyword matching, capitalization checks, and pattern analysis.
 * 
 * @param {ContactFormData} data - The submission data to moderate.
 * @returns {Promise<ModerationResult>} The moderation result based on heuristics.
 */
export async function moderateHeuristic(data: ContactFormData): Promise<ModerationResult> {
  const content = `${data.name} ${data.email || ''} ${data.message} ${data.subject || ''}`.toLowerCase();
  const fullContent = `${data.name} ${data.message} ${data.subject || ''}`;

  // Spam keywords
  const spamKeywords = [
    'viagra', 'cialis', 'casino', 'lottery', 'crypto', 'bitcoin',
    'investment opportunity', 'click here', 'buy now', 'limited offer',
    'act now', 'congratulations', 'winner', 'prize', 'free money',
  ];

  // Check for spam keywords
  for (const keyword of spamKeywords) {
    if (content.includes(keyword.toLowerCase())) {
      return {
        verdict: 'BLOCK',
        reason: 'Spam keyword detected',
      };
    }
  }

  // Check for excessive capitalization
  if (/([A-Z\s]{20,})/g.test(fullContent)) {
    return {
      verdict: 'REVIEW',
      reason: 'Excessive capitalization detected',
    };
  }

  // Check for character repetition
  if (/(.)\1{10,}/g.test(fullContent)) {
    return {
      verdict: 'BLOCK',
      reason: 'Suspicious pattern detected',
    };
  }

  // Check message length (very short or empty)
  if (data.message.trim().length < 10) {
    return {
      verdict: 'BLOCK',
      reason: 'Message too short',
    };
  }

  // Check for excessive links
  const urlCount = (data.message.match(/https?:\/\//gi) || []).length;
  if (urlCount > 2) {
    return {
      verdict: 'REVIEW',
      reason: 'Too many links',
    };
  }

  // Check for repeated characters that might indicate spam
  const repeatedCharsPattern = /(.{2,})\1{3,}/i;
  if (repeatedCharsPattern.test(data.message)) {
    return {
      verdict: 'REVIEW',
      reason: 'Repeated patterns detected',
    };
  }

  return {
    verdict: 'ALLOW',
  };
}
