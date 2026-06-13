# Phase 0 foundation

This document records architecture decisions for the initial project scaffold.

## Layout

The Next.js app lives at the repository root. A single-product SaaS does not need a monorepo until multiple deployable apps or shared packages exist.

## Database

**Drizzle ORM** is used for SQL-like control, lightweight migrations, and a clear schema file at `db/schema.ts`.

Phase 0 has no application tables. Database connectivity is verified with `SELECT 1`. Tables are added starting in Phase 1.

## Environment configuration

Server environment variables are validated in `lib/env.ts` using Zod (`lib/env-schema.ts`). The app fails fast at startup when required variables are missing or invalid. Error messages list field names only, never values.

Three deployment targets are supported via `APP_ENV`:

- **local**: developer machines (`localhost`, Docker Postgres)
- **dev**: shared staging on a dev subdomain, optionally IP-restricted via `DEV_ALLOWED_CIDRS`
- **prod**: customer-facing production

See [environments.md](environments.md) for templates and setup commands.

Local setup uses `pnpm setup`, which runs `scripts/setup-env.sh`:

- Copies `.env.example` to `.env`
- Refuses to overwrite an existing `.env` unless `--force` is passed
- Sets `.env` permissions to `600`

## Local PostgreSQL

Docker Compose runs `postgres:16-alpine` bound to `127.0.0.1:5432` so the database is not exposed on the local network.

## Theming

The UI uses native soft dark mode via `class="dark"` on `<html>`. Colors follow a Discord-inspired palette:

- Background: `#313338`
- Panel: `#2B2D31`
- Card: `#383A40`
- Border: `#45474F`
- Text: `#F2F3F5`
- Muted text: `#B5BAC1`
- Accent: `#7289DA`

Pure black backgrounds are avoided.

## Data and security principles (forward-looking)

- Structured JSON answers in PostgreSQL are the source of truth, not PDFs.
- Social Security Numbers are never stored in Postgres, logs, analytics, or uploaded files.
- SSN may exist only in memory during on-demand PDF generation (Phase 4).
- Final filled I-129F PDFs containing SSNs are not persisted.

## HTTP security headers

Phase 0 sets baseline headers in `next.config.ts`:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` denying unused browser APIs

HSTS and Content-Security-Policy are deferred to Phase 9 production deployment with Caddy.

## Deferred to later phases

| Concern | Phase |
|---------|-------|
| Auth, sessions, Argon2, TOTP | 1 |
| Case dashboard | 2 |
| I-129F questionnaire | 3 |
| PDF generation | 4 |
| Evidence uploads (local disk, then R2) | 5 |
| Evidence packet export | 6 |
| Stripe payments | 7 |
| Support tickets | 8 |
| VPS, Caddy, PM2, CI/CD | 9 |
