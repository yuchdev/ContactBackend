import type { ContactFormData, Env } from '../types';

/**
 * Send Telegram notification
 */
export async function sendTelegramNotification(
  data: ContactFormData,
  env: Env
): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.warn('Telegram configuration not available');
    return false;
  }

  const message = `
🔔 *New Contact Form Submission*

*From:* ${escapeMarkdown(data.name)}
*Email:* ${escapeMarkdown(data.email)}
${data.subject ? `*Subject:* ${escapeMarkdown(data.subject)}` : ''}

*Message:*
${escapeMarkdown(data.message)}

_Submitted at: ${new Date().toISOString()}_
  `.trim();

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', response.status, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
}

/**
 * Escape special characters for Telegram Markdown
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
