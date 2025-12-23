
export interface LogFields {
  request_id?: string;
  path?: string;
  method?: string;
  origin?: string;
  ip_hash?: string;
  dedupe_hash?: string;
  moderation_verdict?: string;
  status?: number;
  reject_code?: string;
  error?: any;
  [key: string]: any;
}

function obfuscateEmail(email?: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return `***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

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

  const logEntry = {
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

  return JSON.stringify(logEntry);
}

export function logInfo(event: string, fields: LogFields) {
  console.log(formatLog(event, fields));
}

export function logWarn(event: string, fields: LogFields) {
  console.warn(formatLog(event, fields));
}

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
