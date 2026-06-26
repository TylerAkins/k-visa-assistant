import { z } from "zod";

import type {
  QuestionnaireAnswerValue,
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

function isJsonSerializable(
  value: unknown,
  seen = new WeakSet<object>(),
): value is QuestionnaireAnswerValue {
  if (value === null) {
    return true;
  }

  if (["string", "number", "boolean"].includes(typeof value)) {
    return Number.isFinite(value) || typeof value !== "number";
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return value.every((item) => isJsonSerializable(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return false;
    }

    seen.add(value);
    return Object.values(value).every((item) => isJsonSerializable(item, seen));
  }

  return false;
}

export const questionnaireAnswerValueSchema = z
  .unknown()
  .refine(isJsonSerializable, "Answer value must be JSON serializable.");

export const upsertQuestionnaireAnswerSchema = z.object({
  questionKey: z.string().trim().min(1).max(120),
  value: questionnaireAnswerValueSchema,
});

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

export type UpsertQuestionnaireAnswerInput = z.infer<
  typeof upsertQuestionnaireAnswerSchema
>;
export type QuestionnaireCaseStateInput = z.infer<
  typeof questionnaireCaseStateSchema
>;
