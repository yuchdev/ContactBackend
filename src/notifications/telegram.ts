import type { ContactFormData, Env } from '../types';

/**
 * Sends a notification message to a Telegram chat.
 * 
 * @param {ContactFormData} data - The submission data.
 * @param {Env} env - Environment variables containing Telegram bot token and chat ID.
 * @param {string} [dedupeHash] - Optional deduplication hash for metadata.
 * @returns {Promise<boolean>} True if the notification was sent successfully, false otherwise.
 */
export async function sendTelegramNotification(
  data: ContactFormData,
  env: Env,
  dedupeHash?: string
): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.warn('Telegram configuration not available');
    return false;
  }

  // Truncate message to Telegram limit (3500 chars to be safe)
  const truncatedMessage = data.message.length > 3500 
    ? data.message.substring(0, 3497) + '...'
    : data.message;

  const message = `
🔔 *New Contact Form Submission*

*From:* ${escapeMarkdown(data.name)}
*Email:* ${data.email ? escapeMarkdown(data.email) : 'Not provided'}
*Subject:* ${escapeMarkdown(data.subject)}

*Message:*
${escapeMarkdown(truncatedMessage)}

_Metadata:_
_Timestamp: ${new Date().toISOString()}_
${dedupeHash ? `_Dedupe Hash: ${dedupeHash.substring(0, 16)}..._` : ''}
  `.trim();

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', response.status, error);
      return false;
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Telegram API timeout');
    } else {
      console.error('Failed to send Telegram notification:', error);
    }
    return false;
  }
}

/**
 * Escapes special characters in a string to ensure it is valid Telegram Markdown.
 * 
 * @param {string} text - The text to escape.
 * @returns {string} The escaped text.
 */
function escapeMarkdown(text: string): string {
  // First escape backslashes, then escape other special characters
  return text
    .replace(/\\/g, '\\\\')
    .replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
