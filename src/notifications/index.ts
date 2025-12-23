import type { ContactFormData, Env, NotificationResult } from '../types';
import { createGitHubIssue } from './github';
import { sendTelegramNotification } from './telegram';
import { logWarn } from '../log';

/**
 * Send notifications via available channels
 * GitHub is primary, Telegram is the fallback
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
