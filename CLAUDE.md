# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Cloudflare Worker (TypeScript) exposing a single endpoint, `POST /api/contact`, for a contact form hosted on a static site. A submission is validated, moderated, delivered as a GitHub Issue (Telegram as fallback), and persisted. Public API contract, security model, and deployment details live in `README.md` and `docs/` (`api.md`, `security.md`, `deployment.md`, `testing.md`).

## Commands

```bash
npm run dev                  # wrangler dev, http://localhost:8787 (reads .dev.vars)
npm test                     # vitest run (all tests, offline)
npm test -- test/validation.test.ts   # single file
npm test -- -t "name"        # single test by name
npm run check                # tsc --noEmit (typecheck)
npm run lint                 # eslint .
npm run deploy               # wrangler deploy
npm run db:migrate:local     # apply D1 migrations locally
npm run db:migrate:remote    # apply D1 migrations to production
```

Known drift in the docs/scripts: `README.md` mentions `npm run typecheck` (the real script is `check`), and the `test:integration` script points at `vitest.integration.config.ts`, which does not exist. Integration tests in `test/integration.test.ts` run under plain `npm test`.

## Architecture

Request flow: `src/index.ts` (routing, CORS, 405/404, top-level try/catch, `request_summary` log) → `src/handlers/contact.ts` (the whole pipeline, as numbered steps in comments) → `moderation/`, `notifications/`, `storage/`.

Pipeline order in `handleContactSubmission` matters and is intentionally ordered cheapest-first:
content-type → body size (header, then actual text length) → JSON parse → schema → shared secret → honeypot → IP hash → rate limit → dedupe → moderation → increment rate limit → notify → persist.

Behaviors that are easy to get wrong:
- **Honeypot hits and duplicates return 200 OK** (indistinguishable from success to bots/retries) and are not stored or notified.
- **Moderation `BLOCK`** stores a `REJECTED` record and returns 400; the rate-limit counter is incremented only *after* moderation passes.
- **Notification fallback**: GitHub first; Telegram is attempted only if GitHub fails. Response is 200 if GitHub succeeded, otherwise 202 (`queued`), even when both channels failed.
- **All client-facing errors are generic** (`rejectedResponse(status, corsOrigin)`); the specific `reject_code`/`reason` goes only to structured logs via `src/log.ts`.
- IPs are never stored raw: `hashIP(ip, CONTACT_SECRET)` is the identity used for rate limiting and records.

### Storage

`src/storage/index.ts` picks a `StorageBackend` (`interface.ts`) per request: D1 (`env.DB`, when `USE_D1` is not `"false"`) → KV (`env.KV`) → in-memory (tests/dev). Rate limiting, dedupe, and submission persistence all go through this interface. Schema is in `migrations/0001_init.sql`.

Note `src/utils/rateLimit.ts` and `src/utils/deduplication.ts` are legacy KV-only implementations superseded by the storage backends; the handler does not use them.

### Config

`src/config.ts#parseConfig` validates env on every request and throws if `CONTACT_SECRET`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, or `ALLOWED_ORIGINS` is missing (surfaces as a 500). `wrangler.toml` is a public template with placeholder IDs; the real config (IDs and personal vars) lives in the gitignored `wrangler.local.toml`, which every npm wrangler script passes via `-c`. Secrets are set with `wrangler secret put` or in `.dev.vars` locally. `Env` bindings are typed in `src/types/index.ts`. Note the wrangler config binds KV as `RATE_LIMIT`, while code reads `env.KV`, so KV fallback is not active in the deployed config unless the binding name is aligned.

### Moderation

`moderation/index.ts` dispatches on `MODERATION_MODE` (`heuristic` | `ai` | `off`); `ai_stub.ts` is a placeholder. Verdicts: `ALLOW`, `REVIEW`, `BLOCK`, `ERROR`.

## Testing

Vitest with `globals: true`, `environment: 'node'` (not the Workers pool). Integration tests call `worker.fetch(request, env)` directly with a hand-built `Env` object and no bindings, so storage falls back to `MemoryStorage`. Mock `fetch` for GitHub/Telegram calls.
