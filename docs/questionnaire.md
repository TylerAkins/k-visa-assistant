# Questionnaire

## Architecture

- `features/questionnaire/sections.ts` owns the Phase 3 section registry.
- The registry is the canonical source for stable section identifiers, display order, section titles, progress attachment, and review attachment.
- `questionnaire_sections` remains the database-backed definition table for active sections, but active section keys must match the registry.
- `features/questionnaire/server/` owns case-scoped questionnaire reads and writes.
- `features/questionnaire/validation/` owns answer value and review state validation.

## Section Registry

Phase 3 sections are identified by stable keys:

| Section ID | Display order | Progress attachment | Review attachment |
|------------|---------------|---------------------|-------------------|
| `petitioner` | 10 | Petitioner workflow | `questionnaire_case_state` |
| `beneficiary` | 20 | Beneficiary workflow | `questionnaire_case_state` |
| `relationship` | 30 | Relationship questionnaire workflow | `questionnaire_case_state` |
| `children` | 40 | K-2 children workflow | `questionnaire_case_state` |

Rendering, validation, progress, and review code should consume these identifiers from the registry instead of duplicating string literals or sort order values.

## Case Attachment

- Questionnaire answers attach to the existing case root through `caseId`.
- Per-case questionnaire completion and review status are stored in `questionnaire_case_state`.
- All case-specific questionnaire reads and writes must validate ownership through `assertCaseOwnership(caseId)` before touching answers or review state.
- Unknown active section identifiers fail fast so future screens do not render unsupported questionnaire structure.
- Missing Phase 3 section identifiers fail fast so progress and review states do not drift from the expected workflow.
