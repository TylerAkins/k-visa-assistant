# Questionnaire

## Architecture

- `features/questionnaire/sections.ts` owns the Phase 3 section registry.
- The registry is the canonical source for stable section identifiers, display order, section titles, progress attachment, and review attachment.
- `questionnaire_sections` remains the database-backed definition table for active sections, but active section keys must match the registry.
- `features/questionnaire/server/` owns case-scoped questionnaire reads and writes.
- `features/questionnaire/validation/` owns answer value and review state validation.
- [I-129F questionnaire coverage](i-129f-questionnaire-coverage.md) tracks the form fields, conditional branches, evidence requirements, and known gaps that future questionnaire work must close.

## Section Registry

Phase 3 sections are identified by stable keys:

| Section ID | Display order | Progress attachment | Review attachment |
|------------|---------------|---------------------|-------------------|
| `petitioner` | 10 | Petitioner workflow | `questionnaire_case_state` |
| `beneficiary` | 20 | Beneficiary workflow | `questionnaire_case_state` |
| `relationship` | 30 | Relationship questionnaire workflow | `questionnaire_case_state` |
| `children` | 40 | K-2 children workflow | `questionnaire_case_state` |

Rendering, validation, progress, and review code should consume these identifiers from the registry instead of duplicating string literals or sort order values.

## Petitioner Section

The acceptance-scoped petitioner section uses these stable question definitions:

| Question key | Type | Required | Display order |
|--------------|------|----------|---------------|
| `petitioner_other_names` | `textarea` | No | 10 |
| `petitioner_citizenship_basis` | `select` | Yes | 20 |

`petitioner_citizenship_basis` accepts `birth_us`, `naturalization`, or `certificate`. Phase 2 remains the source of truth for the petitioner's identity and contact details. Repeatable Form I-129F petitioner histories, including addresses, employment, parents, marriages, and prior filings, are not part of this initial section.

## Beneficiary Section

The acceptance-scoped beneficiary section uses these stable question definitions:

| Question key | Type | Required | Display order |
|--------------|------|----------|---------------|
| `beneficiary_currently_in_us` | `boolean` | Yes | 10 |
| `beneficiary_passport_number` | `text` | When visible | 20 |
| `beneficiary_passport_expiration` | `date` | When visible | 30 |

The passport questions are visible and required only when `beneficiary_currently_in_us` is `true`. Selecting no clears saved passport answers through the questionnaire engine's existing hidden-answer behavior. Phase 2 remains the source of truth for the beneficiary's identity, contact details, and address.

## Case Attachment

- Questionnaire answers attach to the existing case root through `caseId`.
- Per-case questionnaire completion and review status are stored in `questionnaire_case_state`.
- All case-specific questionnaire reads and writes must validate ownership through `assertCaseOwnership(caseId)` before touching answers or review state.
- Unknown active section identifiers fail fast so future screens do not render unsupported questionnaire structure.
- Missing Phase 3 section identifiers fail fast so progress and review states do not drift from the expected workflow.

## Dynamic Rendering

Questionnaire UI renders from active `questionnaire_questions` rows grouped by the active section definitions. Form fields must use the stable question `key` as the submitted field name; database UUIDs remain internal identifiers.

Initial supported question types:

| Type | Answer value | Config |
|------|--------------|--------|
| `text` | string or null | none |
| `textarea` | string or null | none |
| `date` | `YYYY-MM-DD` string or null | none |
| `boolean` | boolean or null | none |
| `select` | selected option value or null | `{ "options": [{ "label": "...", "value": "..." }] }` |

Unsupported question types and unexpected config fail during definition mapping instead of silently rendering or dropping submitted values.

Questions may also include one visibility condition in config:

```json
{
  "visibleWhen": {
    "questionKey": "met_in_person",
    "equals": false
  }
}
```

Questions without `visibleWhen` are always visible. Conditional questions are visible only when the referenced answer exactly matches `equals`; missing dependency answers only match `equals: null`. Hidden required questions do not block section saves, and hidden saved answers are cleared when the section is saved.

## Answer Validation

- Section submissions are validated from their active question definitions before any answers are written or hidden answers are cleared.
- Text and textarea answers are trimmed. Blank optional answers are stored as `null`.
- Date answers must be real calendar dates in `YYYY-MM-DD` format.
- Boolean answers accept only yes or no values, and select answers must match a configured option value.
- Required validation applies only to visible questions. Validation failures are returned by stable question key so the UI can display each error beside its field.

## Progress Calculation

- Section completion is derived from active question definitions and persisted answers; it is not stored separately.
- A section must contain at least one active question, and every visible question must have a persisted answer row so an untouched section cannot count as complete.
- Visible required answers must be present and valid. Optional answers may be saved as `null`, but non-null optional answers must still be valid for their question type.
- Hidden conditional questions do not affect completion.
- The four registered sections are weighted equally within the questionnaire's 30 percent share of overall case progress.
- `questionnaire_case_state.completed_at` records when all active sections become complete and is cleared if a later valid save makes the questionnaire incomplete.
