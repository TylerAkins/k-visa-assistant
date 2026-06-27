INSERT INTO "questionnaire_questions" (
  "id",
  "section_id",
  "key",
  "label",
  "help_text",
  "question_type",
  "required",
  "sort_order",
  "active",
  "config",
  "updated_at"
) VALUES
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'beneficiary'),
    'beneficiary_currently_in_us',
    'Is the beneficiary currently in the United States?',
    NULL,
    'boolean',
    true,
    10,
    true,
    NULL,
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'beneficiary'),
    'beneficiary_passport_number',
    'Passport number',
    NULL,
    'text',
    true,
    20,
    true,
    '{"visibleWhen":{"questionKey":"beneficiary_currently_in_us","equals":true}}'::jsonb,
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'beneficiary'),
    'beneficiary_passport_expiration',
    'Passport expiration date',
    NULL,
    'date',
    true,
    30,
    true,
    '{"visibleWhen":{"questionKey":"beneficiary_currently_in_us","equals":true}}'::jsonb,
    now()
  )
ON CONFLICT ("key") DO UPDATE SET
  "section_id" = EXCLUDED."section_id",
  "label" = EXCLUDED."label",
  "help_text" = EXCLUDED."help_text",
  "question_type" = EXCLUDED."question_type",
  "required" = EXCLUDED."required",
  "sort_order" = EXCLUDED."sort_order",
  "active" = EXCLUDED."active",
  "config" = EXCLUDED."config",
  "updated_at" = now();
