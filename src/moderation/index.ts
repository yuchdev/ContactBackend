import type { ContactFormData, ModerationResult } from '../types';
import { moderateHeuristic } from './heuristic';
import { moderateAI } from './ai_stub';

/**
 * Interface defining a strategy for content moderation.
 */
export interface ModerationStrategy {
  /**
   * Moderates the given contact form data.
   * 
   * @param {ContactFormData} data - The submission data to moderate.
   * @returns {Promise<ModerationResult>} The result of the moderation check.
   */
  moderate(data: ContactFormData): Promise<ModerationResult>;
}

/**
 * Performs content moderation based on the selected mode.
 * 
 * @param {ContactFormData} data - The submission data to moderate.
 * @param {'heuristic' | 'ai' | 'off'} [mode='heuristic'] - The moderation mode to use.
 * @returns {Promise<ModerationResult>} The result of the moderation process.
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
