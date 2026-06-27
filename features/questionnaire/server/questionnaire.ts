import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  cases,
  questionnaireAnswers,
  questionnaireCaseState,
  questionnaireQuestions,
  questionnaireSections,
} from "@/db/schema";
import {
  assertCaseOwnership,
  getPhase2CaseProgress,
} from "@/features/cases/server/cases";
import { calculateQuestionnaireProgressContribution } from "@/features/cases/server/progress";
import { calculateQuestionnaireProgress } from "@/features/questionnaire/progress";
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
  QuestionnaireSectionSaveResult,
} from "@/features/questionnaire/types";
import { validateQuestionnaireSectionAnswers } from "@/features/questionnaire/validation/answers";
import {
  parseQuestionnaireQuestionConfig,
  parseQuestionnaireQuestionType,
  questionnaireCaseStateSchema,
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

function mapAnswers(
  rows: (typeof questionnaireAnswers.$inferSelect)[],
  sections: QuestionnaireSection[],
): QuestionnaireAnswer[] {
  const questionKeysById = new Map<string, string>();
  for (const section of sections) {
    for (const question of section.questions) {
      questionKeysById.set(question.id, question.key);
    }
  }

  return rows
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
    .filter((answer): answer is QuestionnaireAnswer => Boolean(answer));
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

  const mappedAnswers = mapAnswers(answers, sections);

  return {
    sections,
    answers: mappedAnswers,
    state: stateRows[0] ? mapCaseState(stateRows[0]) : null,
    progress: calculateQuestionnaireProgress(sections, mappedAnswers),
  };
}

export async function saveQuestionnaireSectionAnswers(
  caseId: string,
  sectionKey: string,
  formData: FormData,
): Promise<QuestionnaireSectionSaveResult> {
  const [questionnaire, phase2Progress] = await Promise.all([
    getQuestionnaireForCase(caseId),
    getPhase2CaseProgress(caseId),
  ]);
  const section = questionnaire.sections.find((item) => item.key === sectionKey);

  if (!section) {
    throw new Error("Questionnaire section not found.");
  }

  const validationResult = validateQuestionnaireSectionAnswers(
    section,
    new Map(
      questionnaire.answers.map((answer) => [answer.questionKey, answer.value]),
    ),
    formData,
  );

  if (!validationResult.success) {
    return validationResult;
  }

  const questionIdsByKey = new Map(
    section.questions.map((question) => [question.key, question.id]),
  );
  const answers = validationResult.answers.map((answer) => {
    const questionId = questionIdsByKey.get(answer.questionKey);

    if (!questionId) {
      throw new Error("Questionnaire question not found.");
    }

    return { ...answer, questionId };
  });
  const now = new Date();
  const sectionQuestionIds = new Set(
    section.questions.map((question) => question.id),
  );

  const saveResult = await db.transaction(async (tx) => {
    const [lockedCase] = await tx
      .select({ id: cases.id })
      .from(cases)
      .where(
        and(
          eq(cases.id, caseId),
          eq(cases.userId, phase2Progress.userId),
        ),
      )
      .for("update");

    if (!lockedCase) {
      throw new Error("Unable to lock case for questionnaire progress update.");
    }

    const currentAnswerRows = await tx
      .select()
      .from(questionnaireAnswers)
      .where(eq(questionnaireAnswers.caseId, caseId));
    const [currentStateRow] = await tx
      .select()
      .from(questionnaireCaseState)
      .where(eq(questionnaireCaseState.caseId, caseId))
      .limit(1);
    const currentAnswers = mapAnswers(
      currentAnswerRows,
      questionnaire.sections,
    );

    for (const questionId of validationResult.hiddenQuestionIds) {
      await tx
        .delete(questionnaireAnswers)
        .where(
          and(
            eq(questionnaireAnswers.caseId, caseId),
            eq(questionnaireAnswers.questionId, questionId),
          ),
        );
    }

    for (const answer of answers) {
      await tx
        .insert(questionnaireAnswers)
        .values({
          caseId,
          questionId: answer.questionId,
          value: answer.value,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [questionnaireAnswers.caseId, questionnaireAnswers.questionId],
          set: {
            value: answer.value,
            updatedAt: now,
          },
        });
    }

    const nextAnswers = [
      ...currentAnswers.filter(
        (answer) => !sectionQuestionIds.has(answer.questionId),
      ),
      ...answers.map(
        (answer) =>
          ({
            caseId,
            questionId: answer.questionId,
            questionKey: answer.questionKey,
            value: answer.value,
            updatedAt: now,
          }) satisfies QuestionnaireAnswer,
      ),
    ];
    const questionnaireProgress = calculateQuestionnaireProgress(
      questionnaire.sections,
      nextAnswers,
    );
    const currentState = currentStateRow ? mapCaseState(currentStateRow) : null;
    const completedAt =
      questionnaireProgress.percent === 100
        ? currentState?.completedAt ?? now
        : null;

    await tx
      .insert(questionnaireCaseState)
      .values({
        caseId,
        completedAt,
        reviewedAt: currentState?.reviewedAt ?? null,
        reviewStatus: currentState?.reviewStatus ?? "not_started",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: questionnaireCaseState.caseId,
        set: { completedAt, updatedAt: now },
      });

    const progressPercent = Math.min(
      100,
      phase2Progress.progressPercent +
        calculateQuestionnaireProgressContribution(
          questionnaireProgress.percent / 100,
        ),
    );

    await tx
      .update(cases)
      .set({ progressPercent, updatedAt: now })
      .where(
        and(
          eq(cases.id, caseId),
          eq(cases.userId, phase2Progress.userId),
        ),
      );

    return { progressPercent, questionnaireProgress };
  });

  return {
    success: true,
    ...saveResult,
  };
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
