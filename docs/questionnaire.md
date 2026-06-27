# Questionnaire

## Architecture

- [`features/questionnaire/sections.ts`](../features/questionnaire/sections.ts) owns the Phase 3 section registry.
- The registry is the canonical source for stable section identifiers, display order, section titles, progress attachment, and review attachment.
- [`db/schema.ts`](../db/schema.ts) defines the database-backed sections, questions, answers, and per-case state. Active section keys must match the registry.
- [`features/questionnaire/server/questionnaire.ts`](../features/questionnaire/server/questionnaire.ts) maps active definitions and owns case-scoped questionnaire reads and writes.
- [`features/questionnaire/actions/index.ts`](../features/questionnaire/actions/index.ts) is the server-action boundary used to save a section and revalidate case screens.
- [`features/questionnaire/components/questionnaire.tsx`](../features/questionnaire/components/questionnaire.tsx) renders supported question types from their definitions instead of defining field-specific validation.
- [`features/questionnaire/conditions.ts`](../features/questionnaire/conditions.ts) is the shared source for conditional visibility and client-side hidden-answer pruning.
- [`features/questionnaire/validation/answers.ts`](../features/questionnaire/validation/answers.ts) owns answer parsing and definition-driven section validation. [`features/questionnaire/validation/schemas.ts`](../features/questionnaire/validation/schemas.ts) validates question configuration and review state.
- [`features/questionnaire/progress.ts`](../features/questionnaire/progress.ts) and [`features/questionnaire/review.ts`](../features/questionnaire/review.ts) reuse the same definitions, visibility rules, and answer validation for completion and review output.
- [I-129F questionnaire coverage](i-129f-questionnaire-coverage.md) tracks the form fields, conditional branches, evidence requirements, and known gaps that future questionnaire work must close.

The definition flow is:

1. Active `questionnaire_sections` and `questionnaire_questions` rows provide the persisted definition.
2. The server maps each row into the typed questionnaire model, validates its type and config, and orders sections through the registry.
3. The component renders each field from that model and submits values by stable question key.
4. The server validates the whole section from the same active definitions before writing answers.
5. Progress and review read the persisted answers and apply the same visibility and validation functions.

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

## Relationship Section

The acceptance-scoped relationship section uses these stable question definitions:

| Question key | Type | Required | Display order |
|--------------|------|----------|---------------|
| `familial_relationship` | `boolean` | Yes | 10 |
| `familial_relationship_details` | `textarea` | When visible | 20 |
| `met_in_person` | `boolean` | Yes | 30 |
| `most_recent_meeting_date` | `date` | When visible | 40 |
| `in_person_meeting_details` | `textarea` | When visible | 50 |
| `meeting_waiver_explanation` | `textarea` | When visible | 60 |
| `relationship_history` | `textarea` | Yes | 70 |

`familial_relationship_details` is visible and required when the couple is related. The meeting date and details are visible and required when `met_in_person` is `true`; otherwise the waiver explanation is visible and required. Changing either controlling answer clears saved answers that belong to the now-hidden branch.

## Children Section

The Children section renders from the case's canonical `k2_children` relationship instead of `questionnaire_answers`. Users must explicitly review the no-children path or provide one to ten complete child records. Each child requires a name, date and country of birth, relationship type, and whether the child lives with the beneficiary. A different residence requires the child's street, city, postal code, and country.

Child saves preserve existing record identifiers, reconcile additions and removals in one transaction, and clear address fields when the child lives with the beneficiary. The section is complete only after review and while every persisted child record remains valid. Child records also appear in questionnaire review output.

## Case Attachment

- Questionnaire answers attach to the existing case root through `caseId`.
- Per-case questionnaire completion and review status are stored in `questionnaire_case_state`.
- Every case-specific read and write must validate the authenticated user's ownership through `assertCaseOwnership(caseId)` before touching answers or review state. New entry points must accept `caseId`; a question or answer identifier alone is not an ownership boundary.
- Section saves lock the owned case and keep answer upserts, hidden-answer deletes, questionnaire state, and overall case progress updates in one transaction.
- The unique `(caseId, questionId)` answer key gives each case one persisted value per question. Definitions are shared, but answers and review state never cross the case boundary.
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

## Answer Persistence

- A successful section save upserts every visible answer by `(caseId, questionId)` and stores its typed value in `questionnaire_answers.value`.
- Validation runs before the transaction changes any answer. An invalid submission returns field errors keyed by stable question key and leaves existing answers unchanged.
- Questions resolved as hidden are deleted for that case during the same transaction as visible-answer upserts. This prevents stale branch answers from affecting later progress or review output.
- The save recalculates questionnaire completion from the resulting answer set, updates `questionnaire_case_state.completed_at`, and rolls the questionnaire contribution into the case's overall progress.
- The Children section is the deliberate exception to question-answer persistence: it uses the case-owned `k2_children` records and review flag described above.

## Progress Calculation

- Section completion is derived from active question definitions and persisted answers; it is not stored separately.
- A section must contain at least one active question, and every visible question must have a persisted answer row so an untouched section cannot count as complete.
- Visible required answers must be present and valid. Optional answers may be saved as `null`, but non-null optional answers must still be valid for their question type.
- Hidden conditional questions do not affect completion.
- The four registered sections are weighted equally within the questionnaire's 30 percent share of overall case progress.
- `questionnaire_case_state.completed_at` records when all active sections become complete and is cleared if a later valid save makes the questionnaire incomplete.

## Adding a Question

1. Add or update the `questionnaire_questions` definition in a new idempotent migration. Use a globally unique, stable snake-case `key`, associate it with an existing section, and preserve existing answers by updating definitions with `ON CONFLICT ("key") DO UPDATE` rather than replacing rows.
2. Choose an existing supported `question_type` and provide only its validated config. Select questions require `options`; conditional questions use `visibleWhen`. Place a controlling question before its dependents in section order so visibility can be resolved deterministically.
3. Do not add per-question parsing to a component, action, or server function. Stable keys become form field names automatically, and the shared renderer, answer parser, visibility helper, progress calculator, and review builder consume the definition.
4. Add focused tests when the definition introduces a new option set or conditional branch. Cover visibility changes, invalid and required values, hidden-answer cleanup, completion, and review behavior as applicable.

Adding another instance of a supported question type should require a definition migration and focused tests, not duplicated validation logic. A genuinely new question type is a questionnaire-engine change and must update the shared type model, config parsing, answer validation, renderer, review formatting, and their tests together.

## Adding a Section

1. Add the stable section identifier and metadata to the section registry. The registry owns title, description, display order, progress attachment, and review attachment.
2. Add the matching `questionnaire_sections` row and its question definitions in an idempotent migration. Registry and active database keys must remain in sync or definition loading fails fast.
3. For a normal question-backed section, rely on the existing definition loader, workflow renderer, section save path, progress calculator, and review builder. Add special-case storage or UI only when the domain has a canonical model outside `questionnaire_answers`, as the Children section does.
4. Keep every new case-specific read and write rooted at `caseId` and enforce ownership before data access. Do not introduce section- or answer-only access paths.
5. Extend registry, definition mapping, rendering, action/server, progress, and review tests for the new section. Include ownership and persistence coverage for any new server path and conditional or validation coverage for its questions.
