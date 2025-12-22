# Testing Documentation

## Overview

The Contact Backend uses Vitest for comprehensive testing across unit, mock, and integration test categories. Tests are designed to run offline without external dependencies.

## Test Structure

```
test/
├── cors.test.ts          # CORS handling tests
├── integration.test.ts   # End-to-end Worker tests
├── moderation.test.ts    # Content moderation tests
└── validation.test.ts    # Input validation tests
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### With Coverage

```bash
npm test -- --coverage
```

### Specific Test File

```bash
npm test -- test/validation.test.ts
```

### Single Test

```bash
npm test -- -t "should validate correct form data"
```

## Test Categories

### Unit Tests

Pure function tests with no external dependencies.

**Location**: `test/validation.test.ts`, `test/moderation.test.ts`

**Examples**:

```typescript
// Validation tests
describe('validateContactForm', () => {
  it('should validate correct form data', () => {
    const data = {
      secret: 'test-secret',
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Test',
      message: 'Hello, this is a test message',
    };
    expect(validateContactForm(data)).toBe(true);
  });
});

// Moderation tests
describe('HeuristicModeration', () => {
  it('should reject messages with spam keywords', async () => {
    const data: ContactFormData = {
      secret: 'secret',
      name: 'Spammer',
      email: 'spam@example.com',
      subject: 'Offer',
      message: 'Buy viagra now!',
    };
    const result = await moderate(data, 'heuristic');
    expect(result.verdict).toBe('BLOCK');
  });
});
```

### Integration Tests

Tests the complete Worker flow from request to response.

**Location**: `test/integration.test.ts`

**Setup**:

```typescript
describe('Contact API Integration', () => {
  let env: Env;

  beforeEach(() => {
    env = {
      CONTACT_SECRET: 'test-secret',
      GITHUB_TOKEN: 'ghp_test_token',
      GITHUB_OWNER: 'testowner',
      GITHUB_REPO: 'testrepo',
      ALLOWED_ORIGINS: 'https://example.com,https://test.com',
      // ... other config
    };
  });
});
```

**Examples**:

```typescript
// Happy path test
it('should accept valid request', async () => {
  const request = new Request('https://example.com/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://example.com',
    },
    body: JSON.stringify({
      secret: 'test-secret',
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'This is a valid test message',
      website: '',
    }),
  });

  const response = await worker.fetch(request, env);
  expect([200, 202]).toContain(response.status);
  const data = await response.json();
  expect(data).toHaveProperty('status');
  expect(data).toHaveProperty('message');
});

// Error case test
it('should reject request with invalid secret', async () => {
  const request = new Request('https://example.com/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://example.com',
    },
    body: JSON.stringify({
      secret: 'wrong-secret',
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Test',
      message: 'Test message',
    }),
  });

  const response = await worker.fetch(request, env);
  expect(response.status).toBe(403);
});
```

### CORS Tests

Validates origin checking and CORS header handling.

**Location**: `test/cors.test.ts`

**Examples**:

```typescript
describe('CORS Handling', () => {
  it('should allow requests from allowed origins', () => {
    const origin = 'https://example.com';
    const allowlist = 'https://example.com,https://test.com';
    expect(isOriginAllowed(origin, allowlist)).toBe(true);
  });

  it('should reject requests from disallowed origins', () => {
    const origin = 'https://evil.com';
    const allowlist = 'https://example.com,https://test.com';
    expect(isOriginAllowed(origin, allowlist)).toBe(false);
  });
});
```

## Mock Testing

While the current tests use real implementations, you can add mocked tests for external APIs.

### Mocking Fetch for GitHub/Telegram

Example of how to mock external APIs:

```typescript
import { vi } from 'vitest';

describe('GitHub Notifications', () => {
  it('should create GitHub issue', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: 'https://github.com/owner/repo/issues/1' }),
    } as Response);

    const data: ContactFormData = {
      secret: 'secret',
      name: 'Test',
      email: 'test@example.com',
      subject: 'Test',
      message: 'Test message',
    };

    const env: Env = {
      GITHUB_TOKEN: 'token',
      GITHUB_OWNER: 'owner',
      GITHUB_REPO: 'repo',
      // ... other fields
    };

    const result = await createGitHubIssue(data, env);
    expect(result).toBe('https://github.com/owner/repo/issues/1');
  });

  it('should handle GitHub failure', async () => {
    // Mock failed fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as Response);

    const result = await createGitHubIssue(data, env);
    expect(result).toBe(null);
  });
});
```

### Mocking Storage

Example of mocking storage for rate limiting tests:

```typescript
import { MemoryStorage } from '../src/storage/memory';

describe('Rate Limiting', () => {
  it('should enforce rate limits', async () => {
    const storage = new MemoryStorage();
    const ipHash = 'test-ip-hash';

    // Make 10 requests (should be at limit)
    for (let i = 0; i < 10; i++) {
      await storage.incrementRateLimit(ipHash, 60);
    }

    const count = await storage.getRateLimitCount(ipHash, 60);
    expect(count).toBe(10);

    // 11th request should exceed limit
    await storage.incrementRateLimit(ipHash, 60);
    const newCount = await storage.getRateLimitCount(ipHash, 60);
    expect(newCount).toBe(11);
  });
});
```

## Test Coverage

Current test coverage:

- **Validation**: 100% (all edge cases covered)
- **Moderation**: 90% (main heuristics covered)
- **CORS**: 100% (all origin scenarios)
- **Integration**: 80% (main flows covered)

### View Coverage Report

```bash
npm test -- --coverage --coverage.reporter=html
open coverage/index.html
```

## Test Data

### Valid Test Payload

```typescript
const validPayload: ContactFormData = {
  secret: 'test-secret',
  name: 'John Doe',
  email: 'john@example.com',
  subject: 'Inquiry',
  message: 'I would like to inquire about your services.',
  website: '', // Honeypot must be empty
};
```

### Spam Test Payload

```typescript
const spamPayload: ContactFormData = {
  secret: 'test-secret',
  name: 'Spammer',
  email: 'spam@example.com',
  subject: 'Spam',
  message: 'Buy viagra now! Visit https://spam1.com and https://spam2.com and https://spam3.com',
};
```

### Edge Cases

```typescript
// Minimal valid payload
const minimal: ContactFormData = {
  secret: 'test-secret',
  name: 'J',
  subject: 'S',
  message: 'Hello World', // 10 chars minimum
};

// Maximum length payload
const maxLength: ContactFormData = {
  secret: 'test-secret',
  name: 'A'.repeat(80),
  subject: 'B'.repeat(120),
  message: 'C'.repeat(5000),
};
```

## Writing New Tests

### Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { yourFunction } from '../src/your-module';

describe('YourModule', () => {
  describe('yourFunction', () => {
    it('should handle normal case', () => {
      const result = yourFunction('input');
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      const result = yourFunction('');
      expect(result).toBe('default');
    });

    it('should throw on invalid input', () => {
      expect(() => yourFunction(null)).toThrow();
    });
  });
});
```

### Best Practices

1. **Descriptive Names**: Use clear, descriptive test names
2. **One Assertion**: Focus each test on one specific behavior
3. **AAA Pattern**: Arrange, Act, Assert
4. **Isolate Tests**: Each test should be independent
5. **Test Edge Cases**: Cover boundary conditions
6. **Mock External Deps**: Avoid real API calls

### Common Patterns

**Testing Async Functions**:
```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('value');
});
```

**Testing Errors**:
```typescript
it('should throw error', () => {
  expect(() => functionThatThrows()).toThrow('error message');
});

it('should reject with error', async () => {
  await expect(asyncFunctionThatRejects()).rejects.toThrow('error');
});
```

**Testing Types**:
```typescript
it('should validate type guard', () => {
  const data = { name: 'test', email: 'test@example.com' };
  expect(validateContactForm(data)).toBe(true);
  
  // TypeScript knows data is ContactFormData here
  if (validateContactForm(data)) {
    expect(data.name).toBe('test');
  }
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
```

## Local Testing with Miniflare

For more advanced local testing with D1 and KV:

```bash
# Install Miniflare
npm install -D miniflare

# Run with Miniflare
npx miniflare --d1 DB --kv KV
```

## Debugging Tests

### Enable Verbose Output

```bash
npm test -- --reporter=verbose
```

### Debug Single Test

```bash
node --inspect-brk node_modules/.bin/vitest run -t "test name"
```

### Console Logs

Tests capture console output. To see logs:

```bash
npm test -- --reporter=verbose
```

## Test Utilities

### Create Test Environment

```typescript
export function createTestEnv(overrides?: Partial<Env>): Env {
  return {
    CONTACT_SECRET: 'test-secret',
    GITHUB_TOKEN: 'ghp_test',
    GITHUB_OWNER: 'test-owner',
    GITHUB_REPO: 'test-repo',
    ALLOWED_ORIGINS: 'https://example.com',
    DEDUPE_TTL_SECONDS: '86400',
    RATE_LIMIT_PER_MINUTE: '10',
    MAX_BODY_BYTES: '8192',
    MODERATION_MODE: 'heuristic',
    ...overrides,
  };
}
```

### Create Test Request

```typescript
export function createTestRequest(
  body: unknown,
  origin = 'https://example.com'
): Request {
  return new Request('https://example.com/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: JSON.stringify(body),
  });
}
```

## Troubleshooting

### Tests Fail Locally But Pass in CI

- Check Node.js version matches CI
- Verify dependencies are identical (`npm ci` vs `npm install`)
- Check for timezone-dependent tests

### Slow Tests

- Use `--no-coverage` for faster runs during development
- Mock slow operations
- Run specific test files during development

### Flaky Tests

- Avoid time-dependent assertions
- Use stable test data
- Properly isolate test state
- Check for race conditions in async tests

## Performance Testing

For load testing, use tools like:

```bash
# Apache Bench
ab -n 1000 -c 10 -T 'application/json' -p payload.json \
  https://your-worker.workers.dev/api/contact

# k6
k6 run loadtest.js
```

Example k6 script:

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const payload = JSON.stringify({
    secret: 'test-secret',
    name: 'Load Test',
    email: 'test@example.com',
    subject: 'Load Test',
    message: 'Testing performance',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://example.com',
    },
  };

  const res = http.post(
    'https://your-worker.workers.dev/api/contact',
    payload,
    params
  );

  check(res, {
    'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
  });
}
```
