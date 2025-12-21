# Contact Backend

A robust, production-ready Cloudflare Workers backend for handling contact form submissions with advanced security features, intelligent moderation, and dual-channel notification system (GitHub + Telegram fallback).

## ✨ Features

### Core Capabilities
- **TypeScript + Wrangler**: Type-safe development with Cloudflare Workers
- **REST API**: Clean `POST /api/contact` endpoint
- **JSON Validation**: Strict schema validation for all inputs
- **D1 Storage**: Persistent submission tracking with SQLite (with KV and memory fallbacks)

### Security
- **Shared Secret**: Prevents unauthorized submissions
- **CORS Allowlist**: Restricts origins to trusted domains
- **Honeypot Field**: Catches automated bots
- **Request Size Limits**: Prevents abuse (configurable, default 8KB)
- **IP-Based Rate Limiting**: Configurable per-minute limits
- **Deduplication**: Prevents duplicate submissions within TTL window
- **IP Hashing**: Privacy-preserving with salt
- **Generic Error Messages**: Prevents security information leakage

### Intelligent Moderation
- **Pluggable System**: Switch between moderation strategies
- **Heuristic Mode** (default): Pattern and keyword-based spam detection
  - Spam keyword detection (viagra, casino, crypto, etc.)
  - Link counting (flags messages with 3+ links)
  - Excessive capitalization detection
  - Character repetition detection
  - Message length validation
- **AI Mode**: Stub for AI provider integration (OpenAI, Perspective API)
- **Off Mode**: Disable moderation completely

### Dual-Channel Notifications
- **GitHub Issues** (Primary): Creates issues in your repository with full details
  - Obfuscated email addresses for privacy
  - Auto-labeling with `contact` label
  - Includes metadata (timestamp, IP hash, dedupe hash)
  - Timeout protection (8 seconds)
- **Telegram Bot** (Fallback): Sends notifications when GitHub fails
  - Markdown-formatted messages
  - Message truncation for Telegram limits
  - Timeout protection (8 seconds)
- **Smart Fallback**: Automatically uses Telegram if GitHub unavailable
- **Status Tracking**: Records delivery status for both channels

### Response System
- **200 OK**: GitHub notification succeeded
- **202 Queued**: Fallback notification used or both failed
- **400/403 Rejected**: Validation, moderation, or security check failed

## 📋 Requirements

- Node.js v18 or later
- Cloudflare account (Free tier supported)
- GitHub repository with Issues enabled
- (Optional) Telegram Bot for fallback notifications

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/yuchdev/ContactBackend.git
cd ContactBackend
npm install
```

### 2. Database Setup

Create D1 database:

```bash
wrangler d1 create contact-backend-db
```

Update `wrangler.toml` with the database ID, then apply migrations:

```bash
wrangler d1 migrations apply contact-backend-db --remote
```

### 3. Configuration

Create `.dev.vars` for local development:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your values:

```bash
# Required
CONTACT_SECRET=your-secure-random-secret
GITHUB_TOKEN=ghp_your_github_token
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
ALLOWED_ORIGINS=https://example.com

# Optional (fallback)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

Generate secure secret:
```bash
openssl rand -base64 32
```

### 4. Development

```bash
npm run dev      # Start dev server on http://localhost:8787
npm test         # Run test suite
npm run typecheck  # Type checking
npm run lint     # Code linting
```

### 5. Deployment

Set production secrets:

```bash
wrangler secret put CONTACT_SECRET
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_OWNER
wrangler secret put GITHUB_REPO
```

Deploy:

```bash
npm run deploy
```

Your Worker will be available at `https://your-worker.workers.dev`

## 📖 API Contract

### Request Format

```json
{
  "secret": "your-shared-secret",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "subject": "Product inquiry",
  "message": "I'm interested in your services...",
  "website": "",
  "ts": 1704067200
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `secret` | string | Yes | Matches `CONTACT_SECRET` |
| `name` | string | Yes | 1-80 characters |
| `email` | string | No | Valid email format |
| `subject` | string | Yes | 1-120 characters |
| `message` | string | Yes | 1-5000 characters |
| `website` | string | No | Must be empty (honeypot) |
| `ts` | number | No | Unix timestamp |

### Response Format

**Success (200 OK)**:
```json
{
  "status": "ok",
  "message": "Thank you for your message. We will get back to you soon!"
}
```

**Queued (202 Accepted)**:
```json
{
  "status": "queued",
  "message": "Your message has been queued for processing."
}
```

**Rejected (400/403/413/429)**:
```json
{
  "status": "rejected",
  "message": "Unable to process this request."
}
```

### Browser Example

```javascript
const response = await fetch('https://your-worker.workers.dev/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret: 'your-shared-secret',
    name: 'Jane Smith',
    email: 'jane@example.com',
    subject: 'Question',
    message: 'I have a question about your services.',
    website: '',
  }),
});

const data = await response.json();
console.log(data.status); // "ok" or "queued" or "rejected"
```

## 🏗️ Architecture

```
src/
├── index.ts              # Worker entry point & routing
├── config.ts             # Environment configuration parser
├── types/
│   └── index.ts          # TypeScript interfaces
├── handlers/
│   └── contact.ts        # Main contact form handler
├── utils/
│   ├── validation.ts     # Input validation & schema
│   ├── hashing.ts        # Hash utilities (SHA-256, IDs)
│   ├── response.ts       # Response builders
│   ├── cors.ts           # CORS handling
│   ├── deduplication.ts  # Legacy dedupe (replaced by storage)
│   └── rateLimit.ts      # Legacy rate limit (replaced by storage)
├── moderation/
│   ├── index.ts          # Moderation orchestration
│   ├── heuristic.ts      # Heuristic spam detection
│   └── ai_stub.ts        # AI moderation stub
├── notifications/
│   ├── index.ts          # Notification orchestration
│   ├── github.ts         # GitHub issue creation
│   └── telegram.ts       # Telegram messaging
└── storage/
    ├── index.ts          # Storage backend selector
    ├── interface.ts      # Storage interface
    ├── d1.ts             # D1 implementation
    ├── kv.ts             # KV implementation
    └── memory.ts         # Memory implementation (testing)

migrations/
└── 0001_init.sql         # D1 schema

test/
├── integration.test.ts   # End-to-end tests
├── validation.test.ts    # Validation tests
├── moderation.test.ts    # Moderation tests
└── cors.test.ts          # CORS tests

docs/
├── api.md                # Detailed API documentation
├── security.md           # Security threat model
├── deployment.md         # Deployment guide
└── testing.md            # Testing guide
```

## 🔒 Security

The backend implements defense-in-depth security:

1. **Shared Secret**: Prevents unauthorized access
2. **CORS Allowlist**: Blocks cross-origin attacks
3. **Honeypot**: Catches basic bots
4. **Rate Limiting**: Mitigates DoS attacks (10 req/min default)
5. **Deduplication**: Prevents replay attacks (24h TTL default)
6. **Size Limits**: Prevents large payload attacks (8KB default)
7. **IP Hashing**: Privacy-preserving with salt
8. **Generic Errors**: Prevents information leakage
9. **Timeouts**: Protects against hanging requests (8s)
10. **Email Obfuscation**: Protects privacy in public issues

See [Security Documentation](docs/security.md) for full threat model.

## 🛡️ Moderation System

### Heuristic Mode (Default)

Checks for common spam patterns:
- **Spam Keywords**: viagra, casino, crypto, etc.
- **Link Density**: Flags messages with 3+ URLs
- **Caps Abuse**: Detects excessive capitalization
- **Repetition**: Catches repeated characters
- **Length**: Enforces 10-character minimum

**Verdicts**:
- `ALLOW`: Message passes all checks
- `REVIEW`: Suspicious but not blocked (manual review recommended)
- `BLOCK`: Clear spam, rejected immediately
- `ERROR`: Moderation system error

### AI Mode (Planned)

Placeholder for AI provider integration:
- OpenAI Moderation API
- Perspective API
- Custom trained models

### Configuration

```bash
MODERATION_MODE=heuristic  # or 'ai' or 'off'
```

## 📦 Storage

### Priority Order

1. **D1** (preferred): Full SQL support, best for production
2. **KV** (fallback): Key-value store, good performance
3. **Memory** (dev only): In-memory, testing only

### D1 Schema

```sql
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  origin TEXT,
  ip_hash TEXT NOT NULL,
  dedupe_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  moderation_verdict TEXT NOT NULL,
  moderation_reason TEXT,
  github_issue_url TEXT,
  github_status TEXT NOT NULL,
  telegram_status TEXT NOT NULL,
  status TEXT NOT NULL
);
```

### Setup

```bash
# Create database
wrangler d1 create contact-backend-db

# Apply migrations
wrangler d1 migrations apply contact-backend-db --remote

# Query database
wrangler d1 execute contact-backend-db \
  --command "SELECT * FROM submissions ORDER BY created_at DESC LIMIT 10"
```

### Maintenance

Purge old records (recommended: 30 days):

```bash
CUTOFF=$(date -d '30 days ago' +%s%3N)
wrangler d1 execute contact-backend-db \
  --command "DELETE FROM submissions WHERE created_at < $CUTOFF"
```

## 📊 Notification Flow

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Validation │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Security   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Moderation  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Store Submission   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  GitHub Issue API   │
│  (with timeout)     │
└──────┬──────────────┘
       │
    Success? ──No──► ┌──────────────────┐
       │             │  Telegram Bot    │
      Yes            │  (fallback)      │
       │             └─────────┬────────┘
       │                       │
       ▼                       ▼
   ┌────────┐           ┌──────────┐
   │ 200 OK │           │ 202 Queued│
   └────────┘           └──────────┘
```

### GitHub Issue Template

```markdown
**Contact Form Submission**

**From:** Jane Smith
**Email:** j***@example.com
**Subject:** Product inquiry

**Message:**
I'm interested in learning more about your services...

---
**Metadata:**
- Timestamp: 2024-01-01T00:00:00.000Z
- Origin: https://example.com
```

### Telegram Message Template

```
🔔 *New Contact Form Submission*

*From:* Jane Smith
*Email:* jane@example.com
*Subject:* Product inquiry

*Message:*
I'm interested in learning more...

_Metadata:_
_Timestamp: 2024-01-01T00:00:00.000Z_
_Dedupe Hash: abc123..._
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm test -- --coverage  # With coverage
```

**Test Coverage**:
- 38 tests across 4 test files
- Unit tests: Validation, moderation
- Integration tests: Full Worker flow
- CORS tests: Origin checking
- Mock-friendly for CI/CD

See [Testing Documentation](docs/testing.md) for details.

## 📚 Documentation

- **[API Reference](docs/api.md)**: Complete API documentation with examples
- **[Security Model](docs/security.md)**: Threat model and security controls
- **[Deployment Guide](docs/deployment.md)**: Step-by-step deployment instructions
- **[Testing Guide](docs/testing.md)**: Test structure and best practices

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONTACT_SECRET` | Yes | - | Shared secret for validation |
| `GITHUB_TOKEN` | Yes | - | GitHub Personal Access Token |
| `GITHUB_OWNER` | Yes | - | GitHub repository owner |
| `GITHUB_REPO` | Yes | - | GitHub repository name |
| `ALLOWED_ORIGINS` | Yes | - | Comma-separated allowed origins |
| `TELEGRAM_BOT_TOKEN` | No | - | Telegram Bot API token |
| `TELEGRAM_CHAT_ID` | No | - | Telegram chat/group ID |
| `USE_D1` | No | `true` | Use D1 if available |
| `DEDUPE_TTL_SECONDS` | No | `86400` | Deduplication window (24h) |
| `RATE_LIMIT_PER_MINUTE` | No | `10` | Max requests per IP per minute |
| `MAX_BODY_BYTES` | No | `8192` | Max request body size (8KB) |
| `MODERATION_MODE` | No | `heuristic` | Moderation mode (heuristic/ai/off) |

### Wrangler Bindings

```toml
# D1 Database (recommended)
[[d1_databases]]
binding = "DB"
database_name = "contact-backend-db"
database_id = "your-database-id"

# KV Namespace (optional, for rate limiting)
[[kv_namespaces]]
binding = "KV"
id = "your-kv-namespace-id"
```

## 💰 Cost Estimates (Cloudflare Free Tier)

For typical usage (100 submissions/day):

| Resource | Free Tier Limit | Estimated Usage | Status |
|----------|----------------|-----------------|--------|
| Workers Requests | 100,000/day | ~200/day | ✅ Well within |
| D1 Reads | 100,000/day | ~300/day | ✅ Well within |
| D1 Writes | 100,000/day | ~100/day | ✅ Well within |
| KV Reads | 100,000/day | ~200/day | ✅ Well within |
| KV Writes | 1,000/day | ~100/day | ✅ Well within |

**Verdict**: Easily runs on Cloudflare Free tier for most use cases.

## 🚨 Troubleshooting

### CORS Errors

```bash
# Test OPTIONS preflight
curl -X OPTIONS https://your-worker.workers.dev/api/contact \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Expected: `204 No Content` with CORS headers

### GitHub 403/401 Errors

- Verify token has `repo` scope
- Check Issues are enabled in repository
- Verify `GITHUB_OWNER` and `GITHUB_REPO` are correct

### Rate Limiting Issues

- Increase `RATE_LIMIT_PER_MINUTE` if needed
- Check for shared IPs (NAT/proxy)
- Monitor logs: `wrangler tail`

### Database Errors

```bash
# Verify database exists
wrangler d1 list

# Check migrations
wrangler d1 migrations list contact-backend-db

# Apply migrations
wrangler d1 migrations apply contact-backend-db --remote
```

See [Deployment Guide](docs/deployment.md) for more troubleshooting.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👤 Author

**Yurii Cherkasov**

- GitHub: [@yuchdev](https://github.com/yuchdev)

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Tested with [Vitest](https://vitest.dev/)
- Deployed with [Wrangler](https://developers.cloudflare.com/workers/wrangler/)

## 🔗 Links

- [Live Demo](https://your-worker.workers.dev/health)
- [Issue Tracker](https://github.com/yuchdev/ContactBackend/issues)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)

