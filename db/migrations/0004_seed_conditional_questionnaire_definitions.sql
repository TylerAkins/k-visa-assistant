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
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
    (SELECT "id" FROM "questionnaire_sections" WHERE "key" = 'relationship'),
    'meeting_waiver_explanation',
    'Meeting waiver explanation',
    'Explain why the in-person meeting requirement does not apply.',
    'textarea',
    true,
    20,
    true,
    '{"visibleWhen":{"questionKey":"met_in_person","equals":false}}'::jsonb,
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
--> statement-breakpoint
UPDATE "questionnaire_questions"
SET
  "sort_order" = 30,
  "updated_at" = now()
WHERE "key" = 'relationship_history';
