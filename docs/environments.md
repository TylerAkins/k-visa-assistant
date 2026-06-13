# Environments

Phase 0 runs on **local only**. Use `pnpm setup`, Docker Postgres, and `pnpm dev` on your machine.

`APP_ENV` (`local` | `dev` | `prod`) is validated at startup and is separate from `NODE_ENV`. The `dev` and `prod` values exist in code and templates so deployment is ready later; they are not in use until Phase 9.

## Local setup (Phase 0)

| Setting | Value |
|---------|-------|
| `APP_ENV` | `local` |
| `NODE_ENV` | `development` |
| Database | Docker Postgres on `127.0.0.1:5432` |
| Template | `.env.example` |

```bash
pnpm setup
docker-compose up -d --wait
pnpm db:migrate
pnpm dev
```

Add `--force` to `pnpm setup` to overwrite an existing `.env`.

## Future deployment targets

These are planned for Phase 9 (VPS + Caddy). Templates are committed now so env shape stays stable.

| `APP_ENV` | Purpose | Typical `NODE_ENV` | Template |
|-----------|---------|-------------------|----------|
| `dev` | Shared staging / pre-prod | `production` | `.env.dev.example` |
| `prod` | Customer-facing production | `production` | `.env.prod.example` |

When deployment begins:

```bash
pnpm setup -- --env dev     # staging template
pnpm setup -- --env prod    # production template
```

## Validation rules

`lib/env-schema.ts` enforces:

- `APP_ENV` must be `local`, `dev`, or `prod`
- `dev` and `prod` require `NODE_ENV=production`
- `DEV_ALLOWED_CIDRS` is only valid when `APP_ENV=dev`
- `DEV_ALLOWED_CIDRS` entries must be canonical IPv4 CIDR blocks (host bits zeroed)
- `DEV_ALLOWED_CIDRS` cannot include `/0` networks

Validation errors list field names only, never secret values.

- `DATABASE_URL` must be a `postgresql://` or `postgres://` URL

## Build

For local development, `pnpm build` uses your `.env` (`APP_ENV=local`). Server modules validate env vars on import, so required variables must be present even for statically prerendered pages.

When you add CI or deploy staging/production later, set `APP_ENV` to `dev` or `prod` with `NODE_ENV=production` and real `DATABASE_URL` / `APP_URL` values on the build host.

## Client IP and rate limiting

`/api/health` is rate limited only when `APP_ENV=local`. When `dev` and `prod` exist, health checks will not be app-rate-limited in Phase 0 so uptime monitors are not blocked by a single caller. Abuse protection for public deployments moves to the reverse proxy in Phase 9.

Rate limiting is in-memory per process. It is suitable for a single VPS; use a shared store if you scale horizontally or need per-user limits on authenticated routes.

Future routes that need per-client limits may use `getRequestClientIp({ trustProxy: true })` only behind a reverse proxy that strips incoming `X-Forwarded-For` / `X-Real-IP` and rewrites them from the real connection source.

## Dev IP restriction (future)

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
