# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment

Create `.dev.vars` file:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set your values:

```env
SHARED_SECRET=your-secret-key-here
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_REPO=owner/repo
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-1001234567890
```

## 3. Update CORS Allowlist

Edit `wrangler.toml` and update the `CORS_ALLOWLIST`:

```toml
[vars]
CORS_ALLOWLIST = "https://yoursite.com,https://www.yoursite.com"
```

## 4. Development

Start the development server:

```bash
npm run dev
```

Your API will be available at `http://localhost:8787/api/contact`

## 5. Test the API

```bash
curl -X POST http://localhost:8787/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: https://yoursite.com" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello, this is a test message!",
    "secret": "your-secret-key-here"
  }'
```

Expected response:

```json
{
  "message": "Thank you for your message. We will get back to you soon!"
}
```

## 6. Run Tests

```bash
npm test
```

## 7. Deploy to Cloudflare

### Set up secrets:

```bash
wrangler secret put SHARED_SECRET
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_REPO
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
```

### (Optional) Create KV namespace:

```bash
wrangler kv:namespace create "KV"
```

Update `wrangler.toml` with the namespace ID returned.

### Deploy:

```bash
npm run deploy
```

## Frontend Integration

### HTML Form Example

```html
<form id="contact-form">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <input type="text" name="website" style="display:none" /> <!-- Honeypot -->
  <button type="submit">Send</button>
</form>

<script>
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
    website: formData.get('website'),
    secret: 'your-shared-secret' // Store this securely on your frontend
  };
  
  try {
    const response = await fetch('https://your-worker.workers.dev/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      e.target.reset();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    alert('Failed to send message. Please try again.');
  }
});
</script>
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SHARED_SECRET` | Yes | Secret key for form validation |
| `GITHUB_TOKEN` | No* | GitHub PAT for creating issues |
| `GITHUB_REPO` | No* | Repository (format: owner/repo) |
| `TELEGRAM_BOT_TOKEN` | No | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | No | Chat ID for notifications |
| `CORS_ALLOWLIST` | Yes | Comma-separated allowed origins |
| `MAX_BODY_SIZE` | No | Max request size (default: 1MB) |
| `RATE_LIMIT_MAX` | No | Max requests per window (default: 10) |
| `RATE_LIMIT_WINDOW` | No | Window in seconds (default: 3600) |

*At least one notification channel (GitHub or Telegram) should be configured.

## Troubleshooting

### CORS Issues

Make sure your origin is in the `CORS_ALLOWLIST` in `wrangler.toml`.

### 401 Unauthorized

Check that the `secret` in your request matches the `SHARED_SECRET` in your environment.

### Rate Limit Issues

If you have KV configured, check the `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` settings.

### No Notifications Received

Check your worker logs:
```bash
wrangler tail
```

Verify GitHub token has `repo` scope and Telegram bot/chat IDs are correct.

## Support

For issues and questions, please open an issue on GitHub.
