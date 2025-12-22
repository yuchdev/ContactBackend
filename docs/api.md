# API Documentation

## Overview

The Contact Backend provides a single REST API endpoint for handling contact form submissions with comprehensive security, moderation, and notification features.

## Base URL

```
https://your-worker.workers.dev
```

## Endpoints

### POST /api/contact

Submit a contact form.

**Request Headers:**

```
Content-Type: application/json
Origin: https://your-allowed-origin.com
```

**Request Body:**

```json
{
  "secret": "your-shared-secret",
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Inquiry about services",
  "message": "I would like to know more about your services...",
  "website": "",
  "ts": 1704067200
}
```

**Field Specifications:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `secret` | string | Yes | - | Shared secret for validation (matches `CONTACT_SECRET` env var) |
| `name` | string | Yes | 1-80 chars | Sender's name |
| `email` | string | No | Valid email format | Sender's email address |
| `subject` | string | Yes | 1-120 chars | Message subject |
| `message` | string | Yes | 1-5000 chars | Message content |
| `website` | string | No | Must be empty | Honeypot field for bot detection |
| `ts` | number | No | Unix timestamp | Optional submission timestamp |

**Response Codes:**

| Code | Status | Description |
|------|--------|-------------|
| 200 | `ok` | Message accepted and GitHub issue created |
| 202 | `queued` | Message queued (GitHub failed, Telegram succeeded or both failed) |
| 400 | `rejected` | Invalid request data or failed moderation |
| 403 | `rejected` | Origin not allowed or invalid secret |
| 413 | `rejected` | Request body too large |
| 429 | `rejected` | Rate limit exceeded |

**Success Response (200 OK):**

```json
{
  "status": "ok",
  "message": "Thank you for your message. We will get back to you soon!"
}
```

**Queued Response (202 Accepted):**

```json
{
  "status": "queued",
  "message": "Your message has been queued for processing."
}
```

**Error Response (400/403/413/429):**

```json
{
  "status": "rejected",
  "message": "Unable to process this request."
}
```

**Notes:**

- All error responses return the same generic message to avoid leaking information about security checks.
- CORS headers are only set for allowed origins.
- Responses are always JSON with `Content-Type: application/json`.

### OPTIONS /api/contact

Handle CORS preflight requests.

**Request Headers:**

```
Origin: https://your-allowed-origin.com
```

**Response (204 No Content):**

```
Access-Control-Allow-Origin: https://your-allowed-origin.com
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

### GET /health

Health check endpoint.

**Response (200 OK):**

```json
{
  "status": "ok"
}
```

## Request Flow

1. **OPTIONS Preflight**: Browser sends OPTIONS request for CORS verification
2. **POST Request**: Client sends POST with form data
3. **Validation**: Request is validated (origin, secret, schema)
4. **Security Checks**: Honeypot, rate limiting, deduplication
5. **Moderation**: Content is checked for spam/abuse
6. **Notification**: GitHub issue created (primary) or Telegram message sent (fallback)
7. **Response**: Appropriate status and message returned

## Examples

### Browser Fetch Example

```javascript
const response = await fetch('https://your-worker.workers.dev/api/contact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    secret: 'your-shared-secret',
    name: 'Jane Smith',
    email: 'jane@example.com',
    subject: 'Question about pricing',
    message: 'What are your pricing options for enterprise customers?',
    website: '', // Always leave empty
  }),
});

const data = await response.json();
console.log(data); // { status: 'ok', message: '...' }
```

### cURL Example

```bash
curl -X POST https://your-worker.workers.dev/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: https://example.com" \
  -d '{
    "secret": "your-shared-secret",
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "Product inquiry",
    "message": "I am interested in learning more about your products.",
    "website": ""
  }'
```

## Error Scenarios

### Invalid Secret

**Request:**
```json
{
  "secret": "wrong-secret",
  ...
}
```

**Response:** `403 Forbidden`
```json
{
  "status": "rejected",
  "message": "Unable to process this request."
}
```

### Disallowed Origin

**Request Headers:**
```
Origin: https://evil.com
```

**Response:** `403 Forbidden` (no CORS headers)

### Rate Limit Exceeded

Too many requests from the same IP within the rate limit window.

**Response:** `429 Too Many Requests`
```json
{
  "status": "rejected",
  "message": "Unable to process this request."
}
```

### Spam Detected

Message contains spam keywords or suspicious patterns.

**Response:** `400 Bad Request`
```json
{
  "status": "rejected",
  "message": "Unable to process this request."
}
```

### Duplicate Submission

Same message submitted within the deduplication TTL window.

**Response:** `200 OK` (idempotent, appears successful)
```json
{
  "status": "ok",
  "message": "Thank you for your message. We will get back to you soon!"
}
```

## Rate Limiting

- **Window**: 1 minute (60 seconds)
- **Default Limit**: 10 requests per IP per minute
- **Configurable**: Via `RATE_LIMIT_PER_MINUTE` environment variable
- **Storage**: Uses D1/KV/Memory depending on available bindings

## Deduplication

- **TTL**: 24 hours (86400 seconds) by default
- **Configurable**: Via `DEDUPE_TTL_SECONDS` environment variable
- **Hash**: Based on normalized email, subject, message, and day bucket
- **Behavior**: Duplicate submissions receive success response without processing

## Moderation

Messages are checked against configurable moderation rules:

### Heuristic Mode (Default)

Checks for:
- Spam keywords (viagra, casino, bitcoin, etc.)
- Excessive capitalization (20+ consecutive caps)
- Character repetition (10+ repeated characters)
- Too many links (>2 URLs)
- Message too short (<10 characters)

### AI Mode

Placeholder for AI provider integration (e.g., OpenAI Moderation API, Perspective API)

### Off Mode

No moderation checks performed

## Notification Flow

1. **Primary**: GitHub Issue Creation
   - Creates issue in configured repository
   - Includes all form data with obfuscated email
   - Tags with `contact` label
   - Returns 200 on success

2. **Fallback**: Telegram Notification
   - Activated if GitHub fails
   - Sends formatted message to configured chat
   - Returns 202 on success

3. **Both Failed**: Queued Status
   - Returns 202
   - Submission stored for manual recovery

## Storage

Submissions are persisted with the following information:

- Unique submission ID
- Timestamp
- Origin
- IP hash (salted, not raw IP)
- Dedupe hash
- Form data (name, email, subject, message)
- Moderation verdict and reason
- GitHub issue URL and status
- Telegram delivery status
- Overall status (ACCEPTED/QUEUED/REJECTED)

**Note**: Raw IP addresses are never stored; only salted hashes are persisted for privacy.
