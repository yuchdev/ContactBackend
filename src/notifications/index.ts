import type { ContactFormData, Env, NotificationResult } from '../types';
import { createGitHubIssue } from './github';
import { sendTelegramNotification } from './telegram';

/**
 * Send notifications via available channels
 * GitHub is primary, Telegram is fallback
 * Returns notification result with status information
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
    console.log('GitHub notification failed, trying Telegram fallback');
    telegramSuccess = await sendTelegramNotification(data, env, dedupeHash);
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
