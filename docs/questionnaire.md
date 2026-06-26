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
