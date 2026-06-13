# Environments

KVisaAssistant uses three deployment targets. These are separate from `NODE_ENV`, which describes the Node.js runtime mode.

| `APP_ENV` | Purpose | Typical `NODE_ENV` | Where it runs |
|-----------|---------|-------------------|---------------|
| `local` | Developer machines only | `development` | `localhost` + Docker Postgres |
| `dev` | Shared staging / pre-prod | `production` | Dev subdomain (e.g. `dev.yourdomain.com`), often IP-restricted |
| `prod` | Customer-facing production | `production` | Primary app domain |

## Environment files

Templates are committed; real `.env` files are never committed.

| Template | Use case |
|----------|----------|
| `.env.example` | Local development |
| `.env.dev.example` | Dev/staging deployment |
| `.env.prod.example` | Production deployment |

Create a local file with:

```bash
pnpm setup                  # APP_ENV=local (default)
pnpm setup -- --env dev     # staging template
pnpm setup -- --env prod    # production template
```

Add `--force` to overwrite an existing `.env`.

## Validation rules

`lib/env-schema.ts` enforces:

- `APP_ENV` must be `local`, `dev`, or `prod`
- `dev` and `prod` require `NODE_ENV=production`
- `DEV_ALLOWED_CIDRS` is only valid when `APP_ENV=dev`
- `DEV_ALLOWED_CIDRS` entries must be canonical IPv4 CIDR blocks (host bits zeroed)
- `DEV_ALLOWED_CIDRS` cannot include `/0` networks

Validation errors list field names only, never secret values.

- `DATABASE_URL` must be a `postgresql://` or `postgres://` URL

## Build and CI

Server modules (`lib/env.ts`, `lib/db/index.ts`) validate environment variables when they are imported. `next build` therefore needs the same required variables as runtime, even for pages that prerender statically.

| Build target | Recommended `APP_ENV` | Notes |
|--------------|----------------------|-------|
| Local dev machine | `local` | Uses Docker Postgres on `127.0.0.1` |
| Staging / production | `dev` or `prod` | Set `NODE_ENV=production` and real `DATABASE_URL` / `APP_URL` in CI or the deploy host |

Do not build deployed artifacts with `APP_ENV=local`. That target is for developer machines only and enables local-only diagnostics on the homepage and health API.

Example CI build:

```bash
APP_ENV=prod NODE_ENV=production \
  APP_URL=https://app.example.com \
  DATABASE_URL=postgresql://user:pass@db.example.com:5432/kvisaassistant \
  pnpm build
```

## Client IP and rate limiting

`/api/health` is rate limited only when `APP_ENV=local`. Deployed `dev` and `prod` health checks are not app-rate-limited in Phase 0 so uptime monitors cannot be blocked by a single caller. Abuse protection for public deployments moves to the reverse proxy in Phase 9.

Rate limiting is in-memory per process. It is suitable for a single VPS; use a shared store if you scale horizontally or need per-user limits on authenticated routes.

Future routes that need per-client limits may use `getRequestClientIp({ trustProxy: true })` only behind a reverse proxy that strips incoming `X-Forwarded-For` / `X-Real-IP` and rewrites them from the real connection source.

## Dev IP restriction

The `DEV_ALLOWED_CIDRS` variable holds a comma-separated CIDR allowlist (for example `203.0.113.0/24,198.51.100.42/32`). The app validates and stores it now; enforcement at the reverse proxy (Caddy) is planned for Phase 9.

## Upgrading an existing local `.env`

If your `.env` predates `APP_ENV`, add this line:

```
APP_ENV=local
```

Or recreate the file:

```bash
pnpm setup -- --force
```
