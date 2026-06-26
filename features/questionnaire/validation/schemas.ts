import { z } from "zod";

import type {
  QuestionnaireQuestionConfig,
  QuestionnaireReviewStatus,
} from "@/features/questionnaire/types";
import { questionnaireQuestionTypes } from "@/features/questionnaire/types";

export const questionnaireReviewStatuses = [
  "not_started",
  "in_review",
  "approved",
  "needs_changes",
] as const satisfies readonly QuestionnaireReviewStatus[];

export const questionnaireQuestionTypeSchema = z.enum(questionnaireQuestionTypes);

const questionnaireSelectOptionSchema = z.object({
  label: z.string().trim().min(1).max(160),
  value: z.string().trim().min(1).max(160),
});

const questionnaireVisibilityConditionSchema = z
  .object({
    questionKey: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z][a-z0-9_]*$/),
    equals: z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
  })
  .strict();

const questionnaireSelectConfigSchema = z
  .object({
    options: z.array(questionnaireSelectOptionSchema).min(1),
    visibleWhen: questionnaireVisibilityConditionSchema.optional(),
  })
  .strict();

const questionnaireConditionalConfigSchema = z
  .object({
    visibleWhen: questionnaireVisibilityConditionSchema,
  })
  .strict();

export const questionnaireCaseStateSchema = z.object({
  completedAt: z.date().nullable().optional(),
  reviewedAt: z.date().nullable().optional(),
  reviewStatus: z.enum(questionnaireReviewStatuses).optional(),
});

export function parseQuestionnaireQuestionConfig(
  questionType: unknown,
  config: unknown,
): QuestionnaireQuestionConfig {
  const parsedType = parseQuestionnaireQuestionType(questionType);

  if (parsedType === "select") {
    return questionnaireSelectConfigSchema.parse(config);
  }

  if (config !== null && config !== undefined) {
    return questionnaireConditionalConfigSchema.parse(config);
  }

  return null;
}

export function parseQuestionnaireQuestionType(questionType: unknown) {
  return questionnaireQuestionTypeSchema.parse(questionType);
}

export type QuestionnaireCaseStateInput = z.infer<
  typeof questionnaireCaseStateSchema
>;
