# Testing

## Unit tests

```bash
pnpm test
pnpm test:coverage
```

`pnpm test` also runs `scripts/verify-lib-tests.sh`, which fails if a `lib/` or `features/` module is missing a sibling `*.test.ts` file (with documented exclusions).

## Coverage policy

We enforce a **practical senior bar**: tests should prove behavior, not chase percentages.

### Global thresholds (in scope code only)

`pnpm test:coverage` enforces **repo-wide** minimums on business logic:

| Metric | Minimum |
|--------|---------|
| Lines / statements / functions | 80% |
| Branches | 75% |

There are **no per-file thresholds**. A single orchestration file with thin glue does not need branch-perfect coverage if the important paths are tested elsewhere.

Coverage is measured under `lib/**`, `features/**`, and `db/**` (minus exclusions below). Open `coverage/index.html` after a coverage run for the interactive report.

### Philosophy

- Test **contracts and behavior**: validation, auth flows, security branches, error messages users see.
- Skip **framework glue** and implementation trivia.
- Prefer a few strong service tests over many tests written only to satisfy a line counter.
- New code should include tests for non-obvious logic; do not add tests solely to bump coverage on unchanged files.

### Required test files

Every `lib/**/*.ts` and `features/**/*.ts` module must have a sibling `*.test.ts`, except:

| Path | Reason |
|------|--------|
| `lib/env.ts` | Thin server-only wrapper (smoke-tested in `lib/env.test.ts`) |
| `db/index.ts` | Database client singleton |

### Out of scope

These are intentionally excluded from coverage gates:

| Path | Reason |
|------|--------|
| `lib/env.ts` | Thin server-only wrapper around `env-schema.ts` |
| `db/index.ts` | Database client singleton; covered by integration/health checks |
| `app/**` | Thin route files; route handlers may have focused tests (e.g. `/api/health`) |
| `components/**` | Presentational UI and shadcn wrappers |
| Config files | `next.config.ts`, `drizzle.config.ts`, etc. |

### What to test

- Pure functions and validation (`lib/env-schema.ts`, `db/health.ts`, feature services)
- Branches and error paths
- Real behavior, not implementation trivia
- API route handlers when they encode security or response contracts

### What not to unit test

- Framework glue with little logic
- Generated or third-party UI primitives
- End-to-end flows (save for Playwright or similar in a later phase)
