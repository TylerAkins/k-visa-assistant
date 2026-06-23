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
  questionnaireCaseStateSchema,
  upsertQuestionnaireAnswerSchema,
} from "@/features/questionnaire/validation/schemas";

function mapQuestion(row: typeof questionnaireQuestions.$inferSelect) {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    helpText: row.helpText,
    questionType: row.questionType,
    required: row.required,
    sortOrder: row.sortOrder,
    config: (row.config ?? null) as QuestionnaireAnswerValue | null,
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

  if (sections.length === 0) {
    return [] satisfies QuestionnaireSection[];
  }

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

  return sections.map((section) => ({
    id: section.id,
    key: section.key,
    title: section.title,
    description: section.description,
    sortOrder: section.sortOrder,
    questions: questionsBySectionId.get(section.id) ?? [],
  })) satisfies QuestionnaireSection[];
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
