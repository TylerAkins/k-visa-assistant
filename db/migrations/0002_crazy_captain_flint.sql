CREATE TABLE "questionnaire_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaire_case_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"review_status" text DEFAULT 'not_started' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaire_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"help_text" text,
	"question_type" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaire_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questionnaire_answers" ADD CONSTRAINT "questionnaire_answers_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_answers" ADD CONSTRAINT "questionnaire_answers_question_id_questionnaire_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questionnaire_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_case_state" ADD CONSTRAINT "questionnaire_case_state_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_section_id_questionnaire_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."questionnaire_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "questionnaire_answers_case_id_idx" ON "questionnaire_answers" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "questionnaire_answers_question_id_idx" ON "questionnaire_answers" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_answers_case_question_idx" ON "questionnaire_answers" USING btree ("case_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_case_state_case_id_idx" ON "questionnaire_case_state" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "questionnaire_questions_section_id_idx" ON "questionnaire_questions" USING btree ("section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_questions_key_idx" ON "questionnaire_questions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "questionnaire_questions_sort_order_idx" ON "questionnaire_questions" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_sections_key_idx" ON "questionnaire_sections" USING btree ("key");--> statement-breakpoint
CREATE INDEX "questionnaire_sections_sort_order_idx" ON "questionnaire_sections" USING btree ("sort_order");