import { z } from "zod";

import { isQuestionVisible } from "@/features/questionnaire/conditions";
import type {
  QuestionnaireAnswerValue,
  QuestionnaireFieldErrors,
  QuestionnaireQuestion,
  QuestionnaireSection,
} from "@/features/questionnaire/types";

const blankToNull = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
};

export const questionnaireTextAnswerSchema = z.preprocess(
  blankToNull,
  z.string().nullable(),
);

export const questionnaireDateAnswerSchema = z.preprocess(
  blankToNull,
  z.string().date().nullable(),
);

export const questionnaireBooleanAnswerSchema = z.preprocess((value) => {
  const normalizedValue = blankToNull(value);

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return normalizedValue;
}, z.boolean().nullable());

type ParsedAnswer =
  | { success: true; value: QuestionnaireAnswerValue }
  | { success: false; error: string };

type SectionValidationResult =
  | {
      success: true;
      answers: Array<{
        questionKey: string;
        value: QuestionnaireAnswerValue;
      }>;
      hiddenQuestionIds: string[];
    }
  | { success: false; fieldErrors: QuestionnaireFieldErrors };

function validationError(question: QuestionnaireQuestion) {
  switch (question.questionType) {
    case "date":
      return `Enter a valid date for "${question.label}".`;
    case "boolean":
      return `Choose yes or no for "${question.label}".`;
    case "select":
      return `Choose a valid option for "${question.label}".`;
    case "text":
    case "textarea":
      return `Enter a valid response for "${question.label}".`;
    default: {
      const unsupportedType: never = question.questionType;
      throw new Error(`Unsupported questionnaire question type: ${unsupportedType}.`);
    }
  }
}

export function parseQuestionnaireAnswer(
  question: QuestionnaireQuestion,
  rawValue: unknown,
): ParsedAnswer {
  const schema = (() => {
    switch (question.questionType) {
      case "text":
      case "textarea":
        return questionnaireTextAnswerSchema;
      case "date":
        return questionnaireDateAnswerSchema;
      case "boolean":
        return questionnaireBooleanAnswerSchema;
      case "select": {
        const optionValues = new Set(
          question.config?.options?.map((option) => option.value) ?? [],
        );

        return z.preprocess(
          blankToNull,
          z
            .string()
            .refine((value) => optionValues.has(value))
            .nullable(),
        );
      }
      default: {
        const unsupportedType: never = question.questionType;
        throw new Error(
          `Unsupported questionnaire question type: ${unsupportedType}.`,
        );
      }
    }
  })();
  const parsed = schema.safeParse(rawValue);

  if (!parsed.success) {
    return { success: false, error: validationError(question) };
  }

  if (question.required && parsed.data === null) {
    return {
      success: false,
      error: `Please answer "${question.label}" before saving.`,
    };
  }

  return { success: true, value: parsed.data };
}

export function validateQuestionnaireSectionAnswers(
  section: QuestionnaireSection,
  existingAnswers: ReadonlyMap<string, QuestionnaireAnswerValue>,
  formData: FormData,
): SectionValidationResult {
  const answers: Array<{
    questionKey: string;
    value: QuestionnaireAnswerValue;
  }> = [];
  const fieldErrors: QuestionnaireFieldErrors = {};
  const hiddenQuestionIds: string[] = [];
  const answersByQuestionKey = new Map(existingAnswers);

  for (const question of section.questions) {
    if (!isQuestionVisible(question, answersByQuestionKey)) {
      hiddenQuestionIds.push(question.id);
      answersByQuestionKey.delete(question.key);
      continue;
    }

    const parsed = parseQuestionnaireAnswer(
      question,
      formData.get(question.key),
    );

    if (!parsed.success) {
      fieldErrors[question.key] = [parsed.error];
      answersByQuestionKey.delete(question.key);
      continue;
    }

    answers.push({ questionKey: question.key, value: parsed.value });
    answersByQuestionKey.set(question.key, parsed.value);
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return { success: true, answers, hiddenQuestionIds };
}
