import type { ContactFormData, ModerationResult, ModerationStrategy } from '../types';

/**
 * Stub moderation - allows all messages
 */
export class StubModeration implements ModerationStrategy {
  async moderate(_data: ContactFormData): Promise<ModerationResult> {
    return {
      allowed: true,
      confidence: 1.0,
    };
  }
}

/**
 * Heuristic moderation - basic spam detection
 */
export class HeuristicModeration implements ModerationStrategy {
  private spamKeywords = [
    'viagra',
    'cialis',
    'casino',
    'lottery',
    'crypto',
    'bitcoin',
    'investment opportunity',
    'click here',
    'buy now',
    'limited offer',
    'act now',
    'congratulations',
  ];

  private suspiciousPatterns = [
    /\b(?:https?:\/\/[^\s]+){3,}/gi, // Multiple URLs
    /([A-Z\s]{20,})/g, // Excessive caps
    /(.)\1{10,}/g, // Character repetition
  ];

  async moderate(data: ContactFormData): Promise<ModerationResult> {
    const content = `${data.name} ${data.email} ${data.message} ${data.subject || ''}`.toLowerCase();

    // Check for spam keywords
    for (const keyword of this.spamKeywords) {
      if (content.includes(keyword.toLowerCase())) {
        return {
          allowed: false,
          reason: 'Spam keyword detected',
          confidence: 0.8,
        };
      }
    }

    // Check for suspicious patterns
    const fullContent = `${data.name} ${data.message} ${data.subject || ''}`;
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(fullContent)) {
        return {
          allowed: false,
          reason: 'Suspicious pattern detected',
          confidence: 0.7,
        };
      }
    }

    // Check message length ratio (very short messages might be spam)
    if (data.message.length < 10) {
      return {
        allowed: false,
        reason: 'Message too short',
        confidence: 0.6,
      };
    }

    // Check for excessive links
    const urlCount = (data.message.match(/https?:\/\//gi) || []).length;
    if (urlCount > 2) {
      return {
        allowed: false,
        reason: 'Too many links',
        confidence: 0.75,
      };
    }

    return {
      allowed: true,
      confidence: 0.9,
    };
  }
}

/**
 * Get moderation strategy based on environment
 */
export function getModerationStrategy(type: 'stub' | 'heuristic' = 'heuristic'): ModerationStrategy {
  switch (type) {
    case 'stub':
      return new StubModeration();
    case 'heuristic':
    default:
      return new HeuristicModeration();
  }
}
