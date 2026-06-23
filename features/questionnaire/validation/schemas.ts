import { z } from "zod";

import type {
  QuestionnaireAnswerValue,
  QuestionnaireReviewStatus,
} from "@/features/questionnaire/types";

export const questionnaireReviewStatuses = [
  "not_started",
  "in_review",
  "approved",
  "needs_changes",
] as const satisfies readonly QuestionnaireReviewStatus[];

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

export type UpsertQuestionnaireAnswerInput = z.infer<
  typeof upsertQuestionnaireAnswerSchema
>;
export type QuestionnaireCaseStateInput = z.infer<
  typeof questionnaireCaseStateSchema
>;
