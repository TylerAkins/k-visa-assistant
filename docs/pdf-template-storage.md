# PDF template storage

Official PDF templates live under `pdf/templates/` and are loaded only by server-side helpers in `lib/pdf/templates.ts`.

## Storage layout

- `pdf/templates/i-129f/uscis-i-129f-01-20-25.pdf` is the official 12-page
  Form I-129F, edition 01/20/25.
- `pdf/generated/` is reserved for generated user PDFs, if they are ever written to disk.
- Template files are committed assets. Generated PDFs do not belong in the template tree.

## Loading rules

- Use `loadI129fTemplate()` for the current I-129F form template.
- Missing templates fail fast with a clear server-side error that names the expected path.
- Template paths are resolved relative to the repository/deployment artifact root and cannot escape the template directory.

## Field mappings

- The official form is an encrypted XFA document. Mapping targets use the XFA
  field names embedded in that edition, such as `Pt2Line38e_Passport`.
- `lib/pdf/i129f-mappings.ts` maps the currently persisted questionnaire
  answers to those fields. It does not represent complete I-129F coverage.
- The mapping layer produces in-memory field values only. A later PDF-filling
  integration is responsible for writing those values into the XFA document.
- Unstructured petitioner other names use a Part 8 entry for Part 1, Item 7;
  they are not guessed into the form's separate family, given, and middle-name
  fields.
- The questionnaire's legacy `certificate` citizenship option is not mapped to
  the form's `U.S. citizen parents` choice. It produces an invalid-input error
  until the questionnaire models the official choice explicitly.
- A `false` answer to `beneficiary_currently_in_us` is not mapped to "No" for
  the form's broader prior-U.S.-presence question. It produces an invalid-input
  error until the questionnaire captures whether the beneficiary has ever been
  in the United States.

## Data handling

- Structured questionnaire and case data remain the source of truth.
- Social Security Numbers are not persisted to Postgres, logs, analytics, or disk-backed PDF artifacts.
- If a future generator writes PDFs to disk, it must keep the output path separate from `pdf/templates/`.
