# Testing

## Unit tests

```bash
pnpm test
pnpm test:coverage
```

`pnpm test` also runs `scripts/verify-lib-tests.sh`, which fails if a `lib/` or `features/` module is missing a sibling `*.test.ts` file (with documented exclusions).

## Coverage policy

We enforce a **practical senior bar**, not 100% repo-wide coverage.

### In scope (90% minimum)

Coverage thresholds apply to business logic under:

- `lib/**/*.ts`
- `features/**/*.ts` (when added in later phases)

Run `pnpm test:coverage` to verify. The command fails if thresholds are not met.

### Required test files

Every `lib/**/*.ts` and `features/**/*.ts` module must have a sibling `*.test.ts`, except:

| Path | Reason |
|------|--------|
| `lib/env.ts` | Thin server-only wrapper (smoke-tested in `lib/env.test.ts`) |
| `lib/db/index.ts` | Database client singleton |

### Out of scope

These are intentionally excluded from coverage gates:

| Path | Reason |
|------|--------|
| `lib/env.ts` | Thin server-only wrapper around `env-schema.ts` |
| `lib/db/index.ts` | Database client singleton; covered by integration/health checks |
| `app/**` | Thin route files; route handlers may have focused tests (e.g. `/api/health`) |
| `components/**` | Presentational UI and shadcn wrappers |
| Config files | `next.config.ts`, `drizzle.config.ts`, etc. |

### What to test

- Pure functions and validation (`lib/env-schema.ts`, `lib/db/health.ts`, feature services)
- Branches and error paths
- Real behavior, not implementation trivia
- API route handlers when they encode security or response contracts

### What not to unit test

- Framework glue with little logic
- Generated or third-party UI primitives
- End-to-end flows (save for Playwright or similar in a later phase)
