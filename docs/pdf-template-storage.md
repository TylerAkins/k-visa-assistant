# PDF template storage

Official PDF templates live under `pdf/templates/` and are loaded only by server-side helpers in `lib/pdf/templates.ts`.

## Storage layout

- `pdf/templates/i-129f/uscis-i-129f-01-20-25.pdf` is the current I-129F source template.
- `pdf/generated/` is reserved for generated user PDFs, if they are ever written to disk.
- Template files are committed assets. Generated PDFs do not belong in the template tree.

## Loading rules

- Use `loadI129fTemplate()` for the current I-129F form template.
- Missing templates fail fast with a clear server-side error that names the expected path.
- Template paths are resolved relative to the repository/deployment artifact root and cannot escape the template directory.

## Data handling

- Structured questionnaire and case data remain the source of truth.
- Social Security Numbers are not persisted to Postgres, logs, analytics, or disk-backed PDF artifacts.
- If a future generator writes PDFs to disk, it must keep the output path separate from `pdf/templates/`.
