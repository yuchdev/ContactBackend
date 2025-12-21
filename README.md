# Contact Backend

A robust Cloudflare Workers backend for handling contact form submissions with advanced security features, moderation, and notification capabilities.

## Features

- **TypeScript + Wrangler**: Built with TypeScript for type safety and Wrangler for Cloudflare Workers deployment
- **REST API**: Exposes `POST /api/contact` endpoint for form submissions
- **JSON Validation**: Strict JSON schema validation for all incoming requests
- **Security**:
  - Shared secret validation (prevents unauthorized submissions)
  - CORS allowlist (restricts origins)
  - Honeypot field (catches bots)
  - Request size limits (prevents abuse)
  - Rate limiting (IP-based, requires KV)
  - Deduplication (prevents duplicate submissions, requires KV)
- **Moderation**:
  - Pluggable moderation hooks
  - Stub moderation (pass-through)
  - Heuristic moderation (spam detection with keyword and pattern matching)
- **Notifications**:
  - GitHub Issue creation (primary channel using PAT)
  - Telegram notifications (fallback channel)
  - Prepared response templates
- **Storage** (Optional):
  - KV namespace for rate limiting and deduplication
  - D1 database support for persistence
- **Testing**: Comprehensive unit tests with Vitest

## API Endpoint

### POST /api/contact

Submit a contact form.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Your message here",
  "subject": "Optional subject",
  "website": "",
  "secret": "your-shared-secret"
}
```

**Fields:**
- `name` (required): Sender's name (1-100 characters)
- `email` (required): Valid email address (max 254 characters)
- `message` (required): Message content (10-5000 characters)
- `subject` (optional): Message subject (max 200 characters)
- `website` (optional): Honeypot field, must be empty
- `secret` (required): Shared secret for validation

**Response:**
```json
{
  "message": "Thank you for your message. We will get back to you soon!"
}
```

**Error Responses:**
- `400`: Invalid request data
- `401`: Unauthorized (invalid secret)
- `403`: Origin not allowed
- `413`: Request body too large
- `429`: Rate limit exceeded
- `500`: Internal server error

## Setup

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Cloudflare account
- Wrangler CLI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yuchdev/ContactBackend.git
cd ContactBackend
```

2. Install dependencies:
```bash
npm install
```

3. Create your local environment file:
```bash
cp .dev.vars.example .dev.vars
```

4. Configure your environment variables in `.dev.vars` (see [Environment Variables](#environment-variables) section)

### Development

Run the development server:
```bash
npm run dev
```

This starts the Wrangler dev server at `http://localhost:8787`

### Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Deployment

1. Configure secrets in Cloudflare:
```bash
wrangler secret put SHARED_SECRET
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_REPO
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
```

2. (Optional) Create KV namespace for rate limiting and deduplication:
```bash
wrangler kv:namespace create "KV"
```
Update `wrangler.toml` with the namespace ID.

3. (Optional) Create D1 database:
```bash
wrangler d1 create contact-backend-db
```
Update `wrangler.toml` with the database ID.

4. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Environment Variables

### Required Secrets

Configure these using `wrangler secret put <NAME>`:

- `SHARED_SECRET`: Secret key required in all contact form submissions (prevents unauthorized access)
- `GITHUB_TOKEN`: Personal Access Token with `repo` scope for creating issues
- `GITHUB_REPO`: GitHub repository in format `owner/repo` (e.g., `yuchdev/ContactBackend`)

### Optional Secrets

- `TELEGRAM_BOT_TOKEN`: Bot token from [@BotFather](https://t.me/botfather)
- `TELEGRAM_CHAT_ID`: Chat ID where notifications should be sent (can be negative for groups)

### Configuration Variables

Configure in `wrangler.toml` or as environment variables:

- `CORS_ALLOWLIST`: Comma-separated list of allowed origins (e.g., `https://example.com,https://www.example.com`)
- `MAX_BODY_SIZE`: Maximum request body size in bytes (default: `1048576` = 1MB)
- `RATE_LIMIT_MAX`: Maximum requests per IP per window (default: `10`)
- `RATE_LIMIT_WINDOW`: Rate limit window in seconds (default: `3600` = 1 hour)

## Architecture

```
src/
├── index.ts              # Main Worker entry point
├── types/               # TypeScript type definitions
│   └── index.ts
├── handlers/            # Request handlers
│   └── contact.ts       # Contact form handler
├── utils/               # Utility functions
│   ├── validation.ts    # Input validation
│   ├── response.ts      # Response helpers
│   ├── cors.ts          # CORS handling
│   ├── rateLimit.ts     # Rate limiting
│   └── deduplication.ts # Duplicate detection
├── moderation/          # Moderation strategies
│   └── index.ts         # Stub and heuristic moderation
└── notifications/       # Notification channels
    ├── index.ts         # Notification orchestration
    ├── github.ts        # GitHub issue creation
    └── telegram.ts      # Telegram notifications
```

## Moderation

The backend includes pluggable moderation strategies:

### Stub Moderation
Pass-through strategy that allows all messages. Useful for testing.

### Heuristic Moderation (Default)
Rules-based spam detection that checks for:
- Spam keywords (viagra, casino, crypto, etc.)
- Excessive URLs (more than 2 links)
- Excessive capitalization
- Character repetition
- Message length (minimum 10 characters)

To change moderation strategy, modify the `getModerationStrategy()` call in `src/handlers/contact.ts`.

## Rate Limiting & Deduplication

Both features require a KV namespace binding. If not configured, they are automatically disabled.

### Rate Limiting
- IP-based limiting using Cloudflare's `CF-Connecting-IP` header
- Configurable limits and windows
- Returns `429` status when limit exceeded

### Deduplication
- Prevents duplicate submissions within 24 hours
- Based on email + message hash
- Silently returns success for duplicates

## Notification Flow

1. **Primary**: GitHub Issue Creation
   - Creates an issue in the configured repository
   - Includes all form data in issue body
   - Tags with `contact-form` label

2. **Fallback**: Telegram Notification
   - Used if GitHub creation fails
   - Sends formatted message to configured chat
   - Uses Markdown formatting

## Security Considerations

1. **Shared Secret**: Store securely and rotate regularly
2. **CORS**: Only allow trusted origins
3. **Rate Limiting**: Adjust based on expected traffic
4. **GitHub PAT**: Use a token with minimal permissions (only `repo` scope needed)
5. **Honeypot**: Keep field name generic (like "website")
6. **Environment Variables**: Never commit secrets to version control

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

Yurii Cherkasov

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
