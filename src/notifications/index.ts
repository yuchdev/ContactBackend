import type { ContactFormData, Env, NotificationResult } from '../types';
import { createGitHubIssue } from './github';
import { sendTelegramNotification } from './telegram';
import { logWarn } from '../log';

/**
 * Sends notifications across all configured channels.
 * GitHub is the primary channel. If it fails, Telegram is used as a fallback.
 * 
 * @param {ContactFormData} data - The submission data to include in notifications.
 * @param {Env} env - Environment variables and secrets.
 * @param {string} dedupeHash - The deduplication hash for the submission.
 * @returns {Promise<NotificationResult>} The result of the notification process.
 */
export async function sendNotifications(
  data: ContactFormData,
  env: Env,
  dedupeHash: string
): Promise<NotificationResult> {
  // Try GitHub first
  const githubIssueUrl = await createGitHubIssue(data, env);
  const githubSuccess = githubIssueUrl !== null;

  let telegramSuccess = false;

  // If GitHub fails, use Telegram as fallback
  if (!githubSuccess) {
    logWarn('notification_failed', { 
      channel: 'github', 
      email: data.email, 
      dedupe_hash: dedupeHash 
    });
    
    telegramSuccess = await sendTelegramNotification(data, env, dedupeHash);
    
    if (!telegramSuccess) {
      logWarn('notification_failed', { 
        channel: 'telegram', 
        email: data.email, 
        dedupe_hash: dedupeHash 
      });
    }
  }

  // Determine final status
  const finalStatus = githubSuccess ? 'ok' : (telegramSuccess ? 'queued' : 'queued');

  return {
    githubSuccess,
    githubIssueUrl,
    telegramSuccess,
    finalStatus,
  };
}

export { createGitHubIssue, sendTelegramNotification };
