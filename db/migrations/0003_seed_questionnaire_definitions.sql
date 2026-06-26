INSERT INTO "questionnaire_sections" (
  "id",
  "key",
  "title",
  "description",
  "sort_order",
  "active",
  "updated_at"
) VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'petitioner',
    'Petitioner',
    'U.S. citizen petitioner information for the case.',
    10,
    true,
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'beneficiary',
    'Beneficiary',
    'Foreign fiance beneficiary information for the case.',
    20,
    true,
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'relationship',
    'Relationship',
    'Relationship history and eligibility details.',
    30,
    true,
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'children',
    'Children',
    'K-2 child information and related review state.',
    40,
    true,
    now()
  )
ON CONFLICT ("key") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "sort_order" = EXCLUDED."sort_order",
  "active" = EXCLUDED."active",
  "updated_at" = now();
--> statement-breakpoint
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
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'petitioner'),
    'petitioner_other_names',
    'Other names used',
    'List prior legal names, aliases, or maiden names.',
    'textarea',
    false,
    10,
    true,
    NULL,
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'petitioner'),
    'petitioner_citizenship_basis',
    'Citizenship basis',
    NULL,
    'select',
    true,
    20,
    true,
    '{"options":[{"label":"Birth in the United States","value":"birth_us"},{"label":"Naturalization","value":"naturalization"},{"label":"Certificate of citizenship","value":"certificate"}]}'::jsonb,
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'beneficiary'),
    'beneficiary_passport_number',
    'Passport number',
    NULL,
    'text',
    false,
    10,
    true,
    NULL,
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'beneficiary'),
    'beneficiary_passport_expiration',
    'Passport expiration date',
    NULL,
    'date',
    false,
    20,
    true,
    NULL,
    now()
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'relationship'),
    'met_in_person',
    'Have you met in person within the last two years?',
    NULL,
    'boolean',
    true,
    10,
    true,
    NULL,
    now()
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'relationship'),
    'relationship_history',
    'Relationship history',
    'Describe how you met and how your relationship developed.',
    'textarea',
    false,
    20,
    true,
    NULL,
    now()
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'children'),
    'children_notes',
    'K-2 child notes',
    'Add any details that affect K-2 child eligibility.',
    'textarea',
    false,
    10,
    true,
    NULL,
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
