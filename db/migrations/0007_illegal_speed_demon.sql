ALTER TABLE "k2_children" ADD COLUMN "country_of_birth" text;--> statement-breakpoint
ALTER TABLE "k2_children" ADD COLUMN "resides_with_beneficiary" boolean;--> statement-breakpoint
ALTER TABLE "k2_children" ADD COLUMN "street1" text;--> statement-breakpoint
ALTER TABLE "k2_children" ADD COLUMN "street2" text;--> statement-breakpoint
ALTER TABLE "k2_children" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "k2_children" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "k2_children" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "k2_children" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "k2_children" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "questionnaire_questions"
SET "active" = false, "updated_at" = now()
WHERE "key" = 'children_notes';
