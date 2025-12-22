import type { ContactFormData, ModerationResult } from '../types';
import { moderateHeuristic } from './heuristic';
import { moderateAI } from './ai_stub';

/**
 * Moderation strategy interface
 */
export interface ModerationStrategy {
  moderate(data: ContactFormData): Promise<ModerationResult>;
}

/**
 * Get moderation function based on mode
 */
export async function moderate(
  data: ContactFormData,
  mode: 'heuristic' | 'ai' | 'off' = 'heuristic'
): Promise<ModerationResult> {
  switch (mode) {
    case 'off':
      return { verdict: 'ALLOW' };
    case 'ai':
      return moderateAI(data);
    case 'heuristic':
    default:
      return moderateHeuristic(data);
  }
}

export { moderateHeuristic } from './heuristic';
export { moderateAI } from './ai_stub';
