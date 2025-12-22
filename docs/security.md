# Security Documentation

## Threat Model

### Threats Addressed

1. **Unauthorized Access**
   - **Threat**: Attackers attempting to submit forms without valid credentials
   - **Mitigation**: Shared secret validation (`CONTACT_SECRET`)
   - **Impact**: Prevents unauthorized form submissions

2. **Cross-Origin Attacks**
   - **Threat**: Malicious websites attempting to submit forms on behalf of users
   - **Mitigation**: CORS origin allowlist (`ALLOWED_ORIGINS`)
   - **Impact**: Only trusted origins can make requests

3. **Bot/Spam Submissions**
   - **Threat**: Automated bots submitting spam content
   - **Mitigation**: Honeypot field, heuristic moderation, rate limiting
   - **Impact**: Reduces spam and abuse

4. **Denial of Service (DoS)**
   - **Threat**: Attackers overwhelming the service with requests
   - **Mitigation**: Rate limiting per IP, request size limits
   - **Impact**: Limits impact of DoS attempts

5. **Replay Attacks**
   - **Threat**: Same message submitted multiple times
   - **Mitigation**: Deduplication with TTL
   - **Impact**: Prevents duplicate submissions within time window

6. **Data Exfiltration**
   - **Threat**: Attackers probing for information about security checks
   - **Mitigation**: Generic error messages for all rejections
   - **Impact**: Prevents information leakage about security mechanisms

7. **Token/Secret Leakage**
   - **Threat**: Secrets exposed in logs or errors
   - **Mitigation**: Never log secrets or full payloads, use environment variables
   - **Impact**: Protects sensitive credentials

8. **Privacy Violations**
   - **Threat**: Raw IP addresses or personal data exposed
   - **Mitigation**: IP hashing with salt, email obfuscation in GitHub issues
   - **Impact**: Protects user privacy

## Security Controls

### 1. Request Validation

**Control**: Multi-layer validation of incoming requests

**Implementation**:
- HTTP method validation (POST only for /api/contact)
- Content-Type validation (must be `application/json`)
- Request body size limit (default 8KB, configurable via `MAX_BODY_BYTES`)
- JSON schema validation (required fields, field lengths)

**Rationale**: Prevents malformed or oversized requests from reaching the application logic.

### 2. Authentication

**Control**: Shared secret validation

**Implementation**:
```typescript
if (!validateSecret(data.secret, config.contactSecret)) {
  return rejectedResponse(403, corsOrigin);
}
```

**Rationale**: Ensures only clients with the shared secret can submit forms. The secret should be:
- Generated with high entropy (e.g., `openssl rand -base64 32`)
- Stored in environment variables (never committed to version control)
- Rotated periodically (recommended: quarterly)
- Different per environment (dev/staging/prod)

**Best Practices**:
- Use Wrangler secrets for production: `wrangler secret put CONTACT_SECRET`
- Use `.dev.vars` for local development (excluded from git)
- Never log or expose the secret in responses

### 3. CORS Protection

**Control**: Origin allowlist validation

**Implementation**:
```typescript
const corsOrigin = getAllowedOrigin(request, env.ALLOWED_ORIGINS);
if (!corsOrigin) {
  return rejectedResponse(403);
}
```

**Rationale**: Prevents cross-origin attacks from unauthorized domains.

**Configuration**:
```bash
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

**Best Practices**:
- Use specific origins (not wildcards)
- Include protocol (https://)
- Include all necessary subdomains
- Review and update regularly

### 4. Honeypot Field

**Control**: Bot detection via hidden form field

**Implementation**:
```typescript
if (!checkHoneypot(data)) {
  // Silently accept (looks like success to bots)
  return okResponse(corsOrigin);
}
```

**Rationale**: Legitimate users don't see or fill the honeypot field. Bots typically fill all fields, revealing themselves.

**Frontend Integration**:
```html
<input type="text" name="website" value="" style="display:none" tabindex="-1" autocomplete="off">
```

**Best Practices**:
- Use generic field name (not "honeypot")
- Hide with CSS (not just `display:none`)
- Add `tabindex="-1"` and `autocomplete="off"`
- Never alert bots (return success response)

### 5. Rate Limiting

**Control**: IP-based request throttling

**Implementation**:
- Per-IP counters stored in D1/KV
- Sliding window algorithm (60 seconds)
- Default: 10 requests per minute
- Configurable via `RATE_LIMIT_PER_MINUTE`

**Rationale**: Prevents individual IPs from overwhelming the service.

**Limitations**:
- May affect users behind NAT/proxy
- Consider adjusting limits based on legitimate traffic patterns
- May need allow-listing for trusted IPs

**Best Practices**:
- Monitor rate limit hits in logs
- Adjust limits based on legitimate usage
- Consider implementing exponential backoff on client side

### 6. Deduplication

**Control**: Prevent duplicate submissions within time window

**Implementation**:
- Hash based on normalized email, subject, message, and day bucket
- SHA-256 hash stored in D1/KV
- Default TTL: 24 hours (configurable via `DEDUPE_TTL_SECONDS`)

**Rationale**: Prevents accidental or malicious duplicate submissions.

**Hash Components**:
```typescript
const dedupeKey = `${normalizedEmail}|${normalizedSubject}|${normalizedMessage}|${dayBucket}`;
const dedupeHash = await generateHash(dedupeKey);
```

**Best Practices**:
- Returns success for duplicates (idempotent behavior)
- Day bucket ensures hash changes daily
- Normalization handles whitespace variations

### 7. Content Moderation

**Control**: Spam and abuse detection

**Implementation**:
- Heuristic mode: Pattern and keyword matching
- AI mode: Placeholder for AI provider (OpenAI, Perspective API)
- Off mode: No moderation

**Heuristic Checks**:
- Spam keywords (viagra, casino, bitcoin, etc.)
- Excessive capitalization (>20 consecutive caps)
- Character repetition (>10 repeated characters)
- Too many links (>2 URLs)
- Message too short (<10 characters)

**Verdicts**:
- `ALLOW`: Message passes all checks
- `REVIEW`: Suspicious but not blocked (for manual review)
- `BLOCK`: Clear spam/abuse, rejected immediately
- `ERROR`: Moderation system error

**Best Practices**:
- Regularly review REVIEW verdicts for false positives
- Update keyword list based on observed spam
- Consider implementing AI moderation for better accuracy

### 8. IP Privacy

**Control**: Hash IP addresses before storage

**Implementation**:
```typescript
const ipHash = await hashIP(clientIP, config.contactSecret);
// Store only ipHash, never raw IP
```

**Rationale**: Protects user privacy while allowing rate limiting and abuse detection.

**Best Practices**:
- Use secret as salt (unique per deployment)
- Never log or store raw IPs
- Document privacy practices for GDPR compliance

### 9. Email Obfuscation

**Control**: Obfuscate emails in GitHub issues

**Implementation**:
```typescript
function obfuscateEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}
```

**Rationale**: Protects email addresses from scrapers while remaining identifiable.

**Example**: `john.doe@example.com` → `j***@example.com`

### 10. Generic Error Messages

**Control**: Avoid leaking security check details

**Implementation**:
All rejections return the same message:
```json
{
  "status": "rejected",
  "message": "Unable to process this request."
}
```

**Rationale**: Prevents attackers from learning which security checks failed, making it harder to bypass them.

**Best Practices**:
- Log detailed reasons server-side
- Never expose specific rejection reasons to client
- Monitor logs for patterns (not individual requests)

### 11. Timeout Protection

**Control**: Limit external API call duration

**Implementation**:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 8000);
// ... fetch with controller.signal
```

**Rationale**: Prevents hanging requests and resource exhaustion.

**Configuration**:
- GitHub timeout: 8 seconds
- Telegram timeout: 8 seconds

### 12. Secret Management

**Control**: Secure handling of credentials

**Implementation**:
- GitHub PAT: `wrangler secret put GITHUB_TOKEN`
- Telegram Bot Token: `wrangler secret put TELEGRAM_BOT_TOKEN`
- Contact Secret: `wrangler secret put CONTACT_SECRET`

**Best Practices**:
- Never commit secrets to version control
- Use `.dev.vars` for local development (in `.gitignore`)
- Rotate secrets regularly
- Use principle of least privilege for GitHub PAT (only `repo` scope)

## Future Security Enhancements

### 1. Cloudflare Turnstile

Add CAPTCHA challenge for additional bot protection:

```typescript
// Verify Turnstile token
const turnstileValid = await verifyTurnstile(data.turnstile_token);
if (!turnstileValid) {
  return rejectedResponse(400, corsOrigin);
}
```

**Benefits**: Stronger bot protection, better UX than traditional CAPTCHAs

### 2. AI-Powered Moderation

Integrate with OpenAI Moderation API or Perspective API:

```typescript
const moderationResult = await openai.moderations.create({
  input: data.message
});
```

**Benefits**: More accurate spam detection, fewer false positives

### 3. Cron-Based Retry

Implement Worker Cron for retrying failed notifications:

```typescript
export default {
  async scheduled(event, env, ctx) {
    // Retry failed GitHub/Telegram notifications
  }
}
```

**Benefits**: Automatic recovery from transient failures

### 4. Advanced Rate Limiting

Implement tiered rate limits or allow-listing:

```typescript
const tier = await getUserTier(ipHash);
const limit = tier === 'premium' ? 100 : 10;
```

**Benefits**: Better support for legitimate heavy users

### 5. Content Security Policy

Add CSP headers to prevent injection attacks:

```typescript
headers['Content-Security-Policy'] = "default-src 'none'";
```

**Benefits**: Defense in depth against XSS

## Compliance Considerations

### GDPR

- IP addresses are hashed (not raw)
- Email obfuscation in public GitHub issues
- Retention policy documented (30 days recommended)
- User data can be deleted on request

### Data Retention

**Recommendation**: Purge submissions older than 30 days

```sql
DELETE FROM submissions WHERE created_at < ?
```

**Cron Setup** (future):
```typescript
// Run daily
if (Date.now() - submission.created_at > 30 * 24 * 60 * 60 * 1000) {
  await storage.deleteSubmission(submission.id);
}
```

## Security Checklist

Before deploying to production:

- [ ] Generate and set strong `CONTACT_SECRET`
- [ ] Configure `ALLOWED_ORIGINS` with only trusted domains
- [ ] Set GitHub PAT with minimal required scopes
- [ ] Configure Telegram bot and chat ID (if using)
- [ ] Review and adjust rate limits for expected traffic
- [ ] Set appropriate `MAX_BODY_BYTES` limit
- [ ] Enable D1 or KV for rate limiting and deduplication
- [ ] Test with various spam/attack scenarios
- [ ] Set up monitoring and alerts
- [ ] Document incident response procedures
- [ ] Add `.dev.vars` to `.gitignore`
- [ ] Never commit secrets to version control
