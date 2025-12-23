
/**
 * Interface representing common fields included in log entries.
 */
export interface LogFields {
  /** Unique ID for the request, typically from Cloudflare (cf-ray). */
  request_id?: string;
  /** Request path (e.g., /api/contact). */
  path?: string;
  /** HTTP method (e.g., POST, OPTIONS). */
  method?: string;
  /** CORS origin of the request. */
  origin?: string;
  /** Hash of the client's IP address for privacy. */
  ip_hash?: string;
  /** Hash used for deduplicating submissions. */
  dedupe_hash?: string;
  /** Outcome of the content moderation check. */
  moderation_verdict?: string;
  /** HTTP response status code. */
  status?: number;
  /** Custom rejection code for failed requests. */
  reject_code?: string;
  /** Error object or information if an error occurred. */
  error?: any;
  /** Additional custom fields for logging. */
  [key: string]: any;
}

/**
 * Obfuscates an email address by replacing characters in the local part with asterisks.
 * 
 * @param {string | null} email - The email address to obfuscate.
 * @returns {string | null} The obfuscated email address.
 */
function obfuscateEmail(email?: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return `***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Formats a log entry as a JSON string, ensuring sensitive information is removed or obfuscated.
 * 
 * @param {string} event - The name of the event being logged.
 * @param {LogFields} fields - The fields to include in the log entry.
 * @returns {string} The formatted JSON string.
 */
function formatLog(event: string, fields: LogFields) {
  const { 
    request_id, path, method, origin, ip_hash, dedupe_hash, 
    moderation_verdict, status, reject_code, ...extra 
  } = fields;

  // Clean up extra fields - ensure no secrets or sensitive data
  // These are explicitly mentioned in requirements to NOT log
  delete extra.secret;
  delete extra.message;
  
  if (extra.email) {
    extra.email = obfuscateEmail(extra.email);
  }

  const logEntry: any = {
    timestamp: new Date().toISOString(),
    event,
    request_id,
    path,
    method,
    origin,
    ip_hash,
    dedupe_hash,
    moderation_verdict,
    status,
    reject_code,
    ...extra
  };

  try {
    return JSON.stringify(logEntry);
  } catch (err) {
    // Fallback for circular references or other stringification issues
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'log_error',
      message: 'Failed to stringify log entry',
      original_event: event,
      status: status
    });
  }
}

/**
 * Logs information level events.
 * 
 * @param {string} event - The name of the event.
 * @param {LogFields} fields - The data to be logged.
 */
export function logInfo(event: string, fields: LogFields) {
  console.log(formatLog(event, fields));
}

/**
 * Logs warning level events.
 * 
 * @param {string} event - The name of the event.
 * @param {LogFields} fields - The data to be logged.
 */
export function logWarn(event: string, fields: LogFields) {
  console.warn(formatLog(event, fields));
}

/**
 * Logs error level events, including error messages and stacks if available.
 * 
 * @param {string} event - The name of the event.
 * @param {LogFields} fields - The data to be logged, potentially containing an error object.
 */
export function logError(event: string, fields: LogFields) {
  // If fields contains an error object, try to format it
  const logFields = { ...fields };
  if (logFields.error instanceof Error) {
    logFields.error_message = logFields.error.message;
    logFields.error_stack = logFields.error.stack;
    delete logFields.error;
  }
  console.error(formatLog(event, logFields));
}
