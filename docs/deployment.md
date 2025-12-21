# Deployment Guide

## Prerequisites

- Node.js v18 or later
- npm or yarn
- Cloudflare account (Free tier supported)
- Wrangler CLI
- GitHub account with repository
- (Optional) Telegram Bot for fallback notifications

## Initial Setup

### 1. Clone and Install

```bash
git clone https://github.com/yuchdev/ContactBackend.git
cd ContactBackend
npm install
```

### 2. Create D1 Database

Create a D1 database for storing submissions:

```bash
wrangler d1 create contact-backend-db
```

Copy the database ID from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "contact-backend-db"
database_id = "your-database-id-here"
```

### 3. Run Migrations

Apply the database schema:

```bash
wrangler d1 migrations apply contact-backend-db --remote
```

For local development:

```bash
wrangler d1 migrations apply contact-backend-db --local
```

### 4. Create KV Namespace (Optional but Recommended)

Create a KV namespace for rate limiting (recommended for better performance):

```bash
wrangler kv:namespace create "KV"
```

Update `wrangler.toml` with the namespace ID:

```toml
[[kv_namespaces]]
binding = "KV"
id = "your-kv-namespace-id"
```

### 5. Configure GitHub

#### Create Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set note: "Contact Backend Worker"
4. Select scopes: **Only `repo`** (or `public_repo` for public repos only)
5. Generate and copy the token

#### Enable Issues

Ensure Issues are enabled in your repository:

1. Go to repository Settings
2. Check "Issues" under Features
3. (Optional) Create labels: `contact`, `moderation/allow`, `moderation/review`

### 6. Configure Telegram (Optional)

#### Create Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow instructions
3. Copy the bot token (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

#### Get Chat ID

1. Add your bot to a chat or group
2. Send a message to the bot
3. Get updates: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Find `"chat":{"id":...}` in the response
5. Use this ID (can be negative for groups)

## Environment Configuration

### Local Development

Create `.dev.vars` file (excluded from git):

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your values:

```bash
# Required
CONTACT_SECRET=generate-secure-random-string-here
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
ALLOWED_ORIGINS=http://localhost:3000,https://example.com

# Optional (fallback)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-1001234567890

# Optional (defaults)
USE_D1=true
DEDUPE_TTL_SECONDS=86400
RATE_LIMIT_PER_MINUTE=10
MAX_BODY_BYTES=8192
MODERATION_MODE=heuristic
```

**Generate Secure Secret:**
```bash
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Production Secrets

Set secrets via Wrangler (encrypted at rest):

```bash
# Required secrets
wrangler secret put CONTACT_SECRET
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_OWNER
wrangler secret put GITHUB_REPO

# Optional secrets
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
```

### Production Variables

Edit `wrangler.toml` for non-secret configuration:

```toml
[vars]
ALLOWED_ORIGINS = "https://example.com,https://www.example.com"
USE_D1 = "true"
DEDUPE_TTL_SECONDS = "86400"
RATE_LIMIT_PER_MINUTE = "10"
MAX_BODY_BYTES = "8192"
MODERATION_MODE = "heuristic"
```

## Local Development

### Start Development Server

```bash
npm run dev
```

The Worker will be available at `http://localhost:8787`

### Test Locally

```bash
curl -X POST http://localhost:8787/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "secret": "your-dev-secret",
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test",
    "message": "This is a test message from local development",
    "website": ""
  }'
```

### Run Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Production Deployment

### First Deployment

```bash
npm run deploy
```

This will:
1. Build the Worker
2. Upload to Cloudflare
3. Deploy to `your-worker.workers.dev`

### Custom Domain (Optional)

1. Add custom domain in Cloudflare Dashboard:
   - Workers & Pages → your-worker → Settings → Triggers
   - Add Custom Domain
2. Configure DNS (Cloudflare handles this automatically)
3. Update `ALLOWED_ORIGINS` to include your custom domain

### Verify Deployment

```bash
# Health check
curl https://your-worker.workers.dev/health

# Test submission
curl -X POST https://your-worker.workers.dev/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: https://example.com" \
  -d '{
    "secret": "your-production-secret",
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Deployment Test",
    "message": "Testing production deployment",
    "website": ""
  }'
```

## Monitoring

### Cloudflare Dashboard

Monitor in Workers & Pages section:
- Requests per second
- Errors
- CPU time
- Success rate

### Logs

View logs in real-time:

```bash
wrangler tail
```

Filter by status:

```bash
wrangler tail --status error
```

### Alerts

Set up alerts in Cloudflare Dashboard:
- High error rate
- Increased latency
- Quota warnings

## Maintenance

### Update Secrets

Rotate secrets periodically:

```bash
wrangler secret put CONTACT_SECRET
wrangler secret put GITHUB_TOKEN
```

**Note**: Update your frontend with the new `CONTACT_SECRET` after rotation.

### Update Dependencies

```bash
npm update
npm audit fix
npm run typecheck
npm test
npm run deploy
```

### Database Maintenance

#### Purge Old Records

```bash
# Get current timestamp minus 30 days
CUTOFF=$(date -d '30 days ago' +%s%3N)

# Execute deletion
wrangler d1 execute contact-backend-db \
  --command "DELETE FROM submissions WHERE created_at < $CUTOFF"
```

#### Backup Database

```bash
wrangler d1 execute contact-backend-db \
  --command "SELECT * FROM submissions" \
  --json > backup_$(date +%Y%m%d).json
```

### View Database

```bash
# Remote database
wrangler d1 execute contact-backend-db \
  --command "SELECT * FROM submissions ORDER BY created_at DESC LIMIT 10"

# Local database
wrangler d1 execute contact-backend-db --local \
  --command "SELECT * FROM submissions ORDER BY created_at DESC LIMIT 10"
```

## Troubleshooting

### CORS Errors

**Problem**: Browser shows CORS error

**Solutions**:
1. Check Origin header matches `ALLOWED_ORIGINS`
2. Ensure protocol (http/https) matches
3. Check for trailing slashes in origin configuration
4. Verify OPTIONS preflight returns 204

**Debug**:
```bash
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://your-worker.workers.dev/api/contact
```

### GitHub Token Errors

**Problem**: GitHub issue creation fails with 401/403

**Solutions**:
1. Verify token has `repo` scope
2. Check token hasn't expired
3. Verify repository name format: `owner/repo`
4. Ensure Issues are enabled in repository settings

**Debug**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.github.com/user/repos
```

### Telegram Errors

**Problem**: Telegram notifications not sent

**Solutions**:
1. Verify bot token format
2. Check chat ID (can be negative)
3. Ensure bot is added to chat/group
4. Check bot has permission to send messages

**Debug**:
```bash
curl https://api.telegram.org/botYOUR_TOKEN/getMe
```

### Rate Limiting Issues

**Problem**: Legitimate users hitting rate limits

**Solutions**:
1. Increase `RATE_LIMIT_PER_MINUTE`
2. Check for users behind NAT/proxy
3. Consider implementing allow-list for trusted IPs
4. Review rate limit window duration

### Database Errors

**Problem**: D1 queries failing

**Solutions**:
1. Verify database binding in `wrangler.toml`
2. Check migrations have been applied
3. Ensure database exists: `wrangler d1 list`
4. Run migrations: `wrangler d1 migrations apply contact-backend-db --remote`

### Deployment Failures

**Problem**: `wrangler deploy` fails

**Solutions**:
1. Verify Wrangler is authenticated: `wrangler whoami`
2. Check `wrangler.toml` syntax
3. Ensure account/zone IDs are correct
4. Try `wrangler deploy --dry-run` first

## Rollback

If deployment causes issues:

```bash
# List deployments
wrangler deployments list

# Rollback to specific deployment
wrangler rollback [deployment-id]
```

## Cost Estimates

### Cloudflare Free Tier

- **Workers**: 100,000 requests/day
- **D1**: 100,000 reads/day, 100,000 writes/day
- **KV**: 100,000 reads/day, 1,000 writes/day

### Expected Usage

For typical contact form (100 submissions/day):
- Workers: ~200 requests (OPTIONS + POST)
- D1 writes: 100
- D1 reads: ~300 (rate limit + dedupe checks)
- KV reads/writes: ~200 (if using KV for rate limiting)

**Estimate**: Well within Free tier limits

### Scaling

If you exceed Free tier:
- Workers: $0.50 per million requests
- D1: $0.50 per million rows read
- KV: $0.50 per million reads

## Security Checklist

Before going to production:

- [ ] Set strong `CONTACT_SECRET` (32+ random bytes)
- [ ] Configure `ALLOWED_ORIGINS` (no wildcards)
- [ ] Rotate default secrets
- [ ] Enable D1 and apply migrations
- [ ] Test from allowed origins
- [ ] Test rejection scenarios
- [ ] Monitor first 24 hours closely
- [ ] Set up alerts
- [ ] Document rollback procedure
- [ ] Test rate limiting behavior
- [ ] Verify spam detection works
- [ ] Check GitHub issues are created correctly
- [ ] Test Telegram fallback (if configured)

## Support

- **Issues**: https://github.com/yuchdev/ContactBackend/issues
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **D1 Docs**: https://developers.cloudflare.com/d1/
