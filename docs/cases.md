# Cases

## Architecture

- `features/cases/server/` owns case reads, writes, ownership checks, and progress calculation.
- `features/cases/validation/` keeps Zod schemas next to the domain they validate.
- `features/cases/components/` holds dashboard cards, overview cards, and sectioned edit forms.
- `features/cases/actions/` contains thin Server Action wrappers that revalidate routes after mutation.

## Ownership Model

- Every case belongs to exactly one authenticated user through `cases.user_id`.
- Petitioners, beneficiaries, and K-2 children are always reached through a case and inherit that ownership boundary.
- Reads and writes must validate the logged-in user against the case before exposing or mutating private data.

## Database Relationships

- `cases` is the root table for the Phase 2 domain.
- `petitioners` and `beneficiaries` are one-to-one with `cases`.
- `k2_children` is one-to-many with `cases` so future children records can be added without reshaping the schema.
- `progress_percent` is stored on `cases` for fast dashboard rendering and future workflow aggregation.

## Progress Calculation

- Case creation starts at 10 percent.
- Completing petitioner details adds 30 percent.
- Completing beneficiary details adds 30 percent.
- Reviewing children adds 10 percent.
- Reaching the questionnaire-ready state adds 20 percent.
- `features/cases/server/progress.ts` owns the calculation so future phases can extend it in one place.

## Future Expansion Strategy

- Questionnaire, evidence, PDF generation, payment, and support-ticket flows should attach to `caseId`.
- The case root should remain stable so future phases can layer new workflows without changing ownership or identity semantics.
- Autosave can be added by swapping form submission behavior, not by changing the data model.
