import type { ContactFormData, Env } from '../types';
import { createGitHubIssue } from './github';
import { sendTelegramNotification } from './telegram';

/**
 * Send notifications via available channels
 * GitHub is primary, Telegram is fallback
 */
export async function sendNotifications(
  data: ContactFormData,
  env: Env
): Promise<void> {
  // Try GitHub first
  const githubSuccess = await createGitHubIssue(data, env);

  // If GitHub fails, use Telegram as fallback
  if (!githubSuccess) {
    console.log('GitHub notification failed, trying Telegram fallback');
    await sendTelegramNotification(data, env);
  } else {
    // Optionally send Telegram notification as well for redundancy
    // Uncomment if you want both notifications
    // await sendTelegramNotification(data, env);
  }
}

export { createGitHubIssue, sendTelegramNotification };
