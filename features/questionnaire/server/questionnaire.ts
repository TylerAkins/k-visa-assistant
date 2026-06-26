import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  questionnaireAnswers,
  questionnaireCaseState,
  questionnaireQuestions,
  questionnaireSections,
} from "@/db/schema";
import { assertCaseOwnership } from "@/features/cases/server/cases";
import { isQuestionVisible } from "@/features/questionnaire/conditions";
import {
  assertCompleteQuestionnaireSectionIds,
  getQuestionnaireSectionMetadata,
  getQuestionnaireSectionSortOrder,
  type QuestionnaireSectionId,
} from "@/features/questionnaire/sections";
import type {
  QuestionnaireAnswer,
  QuestionnaireAnswerValue,
  QuestionnaireCaseState,
  QuestionnaireForCase,
  QuestionnaireQuestion,
  QuestionnaireReviewStatus,
  QuestionnaireSection,
} from "@/features/questionnaire/types";
import {
  parseQuestionnaireQuestionConfig,
  parseQuestionnaireQuestionType,
  questionnaireCaseStateSchema,
  upsertQuestionnaireAnswerSchema,
} from "@/features/questionnaire/validation/schemas";

function mapQuestion(row: typeof questionnaireQuestions.$inferSelect) {
  const questionType = parseQuestionnaireQuestionType(row.questionType);
  const config = parseQuestionnaireQuestionConfig(
    row.questionType,
    row.config ?? null,
  );

  return {
    id: row.id,
    key: row.key,
    label: row.label,
    helpText: row.helpText,
    questionType,
    required: row.required,
    sortOrder: row.sortOrder,
    config,
  } satisfies QuestionnaireQuestion;
}

function mapCaseState(
  row: typeof questionnaireCaseState.$inferSelect,
): QuestionnaireCaseState {
  return {
    caseId: row.caseId,
    completedAt: row.completedAt,
    reviewedAt: row.reviewedAt,
    reviewStatus: row.reviewStatus as QuestionnaireReviewStatus,
    updatedAt: row.updatedAt,
  };
}

export async function listQuestionnaireDefinition(): Promise<
  QuestionnaireSection[]
> {
  const sections = await db
    .select()
    .from(questionnaireSections)
    .where(eq(questionnaireSections.active, true))
    .orderBy(asc(questionnaireSections.sortOrder), asc(questionnaireSections.title));

  const sectionKeys = sections.map((section) => section.key);
  assertCompleteQuestionnaireSectionIds(sectionKeys);

  const questions = await db
    .select()
    .from(questionnaireQuestions)
    .where(eq(questionnaireQuestions.active, true))
    .orderBy(
      asc(questionnaireQuestions.sectionId),
      asc(questionnaireQuestions.sortOrder),
      asc(questionnaireQuestions.label),
    );

  const questionsBySectionId = new Map<string, QuestionnaireQuestion[]>();
  for (const question of questions) {
    const sectionQuestions = questionsBySectionId.get(question.sectionId) ?? [];
    sectionQuestions.push(mapQuestion(question));
    questionsBySectionId.set(question.sectionId, sectionQuestions);
  }

  return [...sections]
    .sort((first, second) => {
      const firstKey = first.key as QuestionnaireSectionId;
      const secondKey = second.key as QuestionnaireSectionId;

      return (
        getQuestionnaireSectionSortOrder(firstKey) -
        getQuestionnaireSectionSortOrder(secondKey)
      );
    })
    .map((section) => {
      const sectionKey = section.key as QuestionnaireSectionId;
      const metadata = getQuestionnaireSectionMetadata(sectionKey);

      return {
        id: section.id,
        key: metadata.id,
        title: metadata.title,
        description: metadata.description,
        sortOrder: metadata.sortOrder,
        questions: questionsBySectionId.get(section.id) ?? [],
      } satisfies QuestionnaireSection;
    });
}

export async function getQuestionnaireForCase(
  caseId: string,
): Promise<QuestionnaireForCase> {
  await assertCaseOwnership(caseId);

  const sections = await listQuestionnaireDefinition();
  const questionKeysById = new Map<string, string>();
  for (const section of sections) {
    for (const question of section.questions) {
      questionKeysById.set(question.id, question.key);
    }
  }

  const [answers, stateRows] = await Promise.all([
    db
      .select()
      .from(questionnaireAnswers)
      .where(eq(questionnaireAnswers.caseId, caseId)),
    db
      .select()
      .from(questionnaireCaseState)
      .where(eq(questionnaireCaseState.caseId, caseId))
      .limit(1),
  ]);

  return {
    sections,
    answers: answers
      .map((answer) => {
        const questionKey = questionKeysById.get(answer.questionId);

        if (!questionKey) {
          return null;
        }

        return {
          caseId: answer.caseId,
          questionId: answer.questionId,
          questionKey,
          value: answer.value as QuestionnaireAnswerValue,
          updatedAt: answer.updatedAt,
        } satisfies QuestionnaireAnswer;
      })
      .filter((answer): answer is QuestionnaireAnswer => Boolean(answer)),
    state: stateRows[0] ? mapCaseState(stateRows[0]) : null,
  };
}

export async function upsertQuestionnaireAnswer(
  caseId: string,
  questionKey: string,
  value: unknown,
): Promise<QuestionnaireAnswer> {
  await assertCaseOwnership(caseId);
  const parsed = upsertQuestionnaireAnswerSchema.parse({ questionKey, value });

  const [question] = await db
    .select()
    .from(questionnaireQuestions)
    .where(
      and(
        eq(questionnaireQuestions.key, parsed.questionKey),
        eq(questionnaireQuestions.active, true),
      ),
    )
    .limit(1);

  if (!question) {
    throw new Error("Questionnaire question not found.");
  }

  const [section] = await db
    .select({ id: questionnaireSections.id })
    .from(questionnaireSections)
    .where(
      and(
        eq(questionnaireSections.id, question.sectionId),
        eq(questionnaireSections.active, true),
      ),
    )
    .limit(1);

  if (!section) {
    throw new Error("Questionnaire question not found.");
  }

  const now = new Date();
  const [answer] = await db
    .insert(questionnaireAnswers)
    .values({
      caseId,
      questionId: question.id,
      value: parsed.value as QuestionnaireAnswerValue,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [questionnaireAnswers.caseId, questionnaireAnswers.questionId],
      set: {
        value: parsed.value as QuestionnaireAnswerValue,
        updatedAt: now,
      },
    })
    .returning();

  if (!answer) {
    throw new Error("Unable to save questionnaire answer.");
  }

  return {
    caseId: answer.caseId,
    questionId: answer.questionId,
    questionKey: question.key,
    value: answer.value as QuestionnaireAnswerValue,
    updatedAt: answer.updatedAt,
  } satisfies QuestionnaireAnswer;
}

async function deleteQuestionnaireAnswer(caseId: string, questionId: string) {
  await db
    .delete(questionnaireAnswers)
    .where(
      and(
        eq(questionnaireAnswers.caseId, caseId),
        eq(questionnaireAnswers.questionId, questionId),
      ),
    );
}

export async function saveQuestionnaireSectionAnswers(
  caseId: string,
  sectionKey: string,
  formData: FormData,
) {
  const questionnaire = await getQuestionnaireForCase(caseId);
  const section = questionnaire.sections.find((item) => item.key === sectionKey);

  if (!section) {
    throw new Error("Questionnaire section not found.");
  }

  const parsedAnswers: { questionKey: string; value: QuestionnaireAnswerValue }[] = [];
  const hiddenQuestionIds: string[] = [];
  const answersByQuestionKey = new Map(
    questionnaire.answers.map((answer) => [answer.questionKey, answer.value]),
  );

  for (const question of section.questions) {
    if (!isQuestionVisible(question, answersByQuestionKey)) {
      hiddenQuestionIds.push(question.id);
      answersByQuestionKey.delete(question.key);
      continue;
    }

    const parsedValue = parseQuestionnaireFormValue(question, formData);

    if (!parsedValue.success) {
      return { success: false, error: parsedValue.error };
    }

    if (question.required && parsedValue.value === null) {
      return {
        success: false,
        error: `Please answer "${question.label}" before saving.`,
      };
    }

    parsedAnswers.push({ questionKey: question.key, value: parsedValue.value });
    answersByQuestionKey.set(question.key, parsedValue.value);
  }

  for (const questionId of hiddenQuestionIds) {
    await deleteQuestionnaireAnswer(caseId, questionId);
  }

  for (const answer of parsedAnswers) {
    await upsertQuestionnaireAnswer(caseId, answer.questionKey, answer.value);
  }

  return { success: true };
}

export async function updateQuestionnaireCaseState(
  caseId: string,
  input: unknown,
): Promise<QuestionnaireCaseState> {
  await assertCaseOwnership(caseId);
  const parsed = questionnaireCaseStateSchema.parse(input);
  const now = new Date();
  const insertValues = {
    caseId,
    completedAt: parsed.completedAt ?? null,
    reviewedAt: parsed.reviewedAt ?? null,
    reviewStatus: parsed.reviewStatus ?? "not_started",
    updatedAt: now,
  } satisfies typeof questionnaireCaseState.$inferInsert;
  const updateValues: Partial<typeof questionnaireCaseState.$inferInsert> = {
    updatedAt: now,
  };

  if ("completedAt" in parsed) {
    updateValues.completedAt = parsed.completedAt ?? null;
  }

  if ("reviewedAt" in parsed) {
    updateValues.reviewedAt = parsed.reviewedAt ?? null;
  }

  if (parsed.reviewStatus) {
    updateValues.reviewStatus = parsed.reviewStatus;
  }

  const [state] = await db
    .insert(questionnaireCaseState)
    .values(insertValues)
    .onConflictDoUpdate({
      target: questionnaireCaseState.caseId,
      set: updateValues,
    })
    .returning();

  if (!state) {
    throw new Error("Unable to save questionnaire state.");
  }

  return mapCaseState(state);
}

function parseQuestionnaireFormValue(
  question: QuestionnaireQuestion,
  formData: FormData,
):
  | { success: true; value: QuestionnaireAnswerValue }
  | { success: false; error: string } {
  const rawValue = formData.get(question.key);
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  switch (question.questionType) {
    case "text":
    case "textarea":
      return { success: true, value: value || null };
    case "date":
      if (!value) {
        return { success: true, value: null };
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return {
          success: false,
          error: `Enter a valid date for "${question.label}".`,
        };
      }

      return { success: true, value };
    case "boolean":
      if (!value) {
        return { success: true, value: null };
      }

      if (value === "true") {
        return { success: true, value: true };
      }

      if (value === "false") {
        return { success: true, value: false };
      }

      return {
        success: false,
        error: `Choose yes or no for "${question.label}".`,
      };
    case "select": {
      if (!value) {
        return { success: true, value: null };
      }

      const option = question.config?.options?.find(
        (item) => item.value === value,
      );

      if (!option) {
        return {
          success: false,
          error: `Choose a valid option for "${question.label}".`,
        };
      }

      return { success: true, value };
    }
    default: {
      const unsupportedType: never = question.questionType;
      throw new Error(`Unsupported questionnaire question type: ${unsupportedType}.`);
    }
  }
}
