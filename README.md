# KVisaAssistant

Guided K-1 visa workflow platform with PDF generation, evidence organization, and case management.

## Prerequisites

- [mise](https://mise.jdx.dev/) for pinned Node and pnpm versions
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) for local PostgreSQL (Mac)

## Quick start

```bash
mise install
pnpm install
pnpm setup
docker-compose up -d --wait
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page shows database status. Verify the API at [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm setup` | Create `.env` from `.env.example` with `chmod 600` |
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm test` | Run unit tests |
| `pnpm test:coverage` | Run unit tests with coverage thresholds on `lib/` and `features/` |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:generate` | Generate migrations from schema changes |

To recreate `.env`, run `pnpm setup -- --force`.

## Environments

Phase 0 runs on **local only**. Use `pnpm setup` (default) with Docker Postgres on this machine.

`APP_ENV` also supports `dev` and `prod` in code and env templates for later deployment (Phase 9). Those targets are not set up yet. See [docs/environments.md](docs/environments.md) when you are ready to deploy.

## Security

- Never commit `.env` files. Templates (`.env.example`, `.env.dev.example`, `.env.prod.example`) are tracked.
- Local `.env` is created with `600` permissions via `pnpm setup`.
- Production secrets must be rotated and stored in environment variables only.
- Social Security Numbers are never stored in the database or on disk. See [docs/phase-0-foundation.md](docs/phase-0-foundation.md).

## Documentation

- [Phase 0 foundation](docs/phase-0-foundation.md): architecture decisions and local environment setup.
- [Environments](docs/environments.md): local setup today; dev/prod templates for later phases.
- [Testing](docs/testing.md): unit test and coverage policy.

## Project status

Phase 0 complete: app scaffold, soft dark theme, validated environment config, Drizzle database connection, and health checks. Auth and case workflows begin in Phase 1.
