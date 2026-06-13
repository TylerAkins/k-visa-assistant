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

Validation errors list field names only, never secret values.

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
