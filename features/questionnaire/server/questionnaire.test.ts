import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockAssertCaseOwnership, mockDb } = vi.hoisted(() => ({
  mockAssertCaseOwnership: vi.fn(),
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@/features/cases/server/cases", () => ({
  assertCaseOwnership: mockAssertCaseOwnership,
}));

import {
  getQuestionnaireForCase,
  updateQuestionnaireCaseState,
  upsertQuestionnaireAnswer,
} from "@/features/questionnaire/server/questionnaire";

function createSelectQuery<T>(rows: T[]) {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    orderBy: vi.fn(() => Promise.resolve(rows)),
    limit: vi.fn(() => Promise.resolve(rows)),
    then: (
      resolve: (value: T[]) => unknown,
      reject: (reason?: unknown) => unknown,
    ) => Promise.resolve(rows).then(resolve, reject),
  };

  return query;
}

function createInsertQuery<T>(rows: T[]) {
  const returning = vi.fn(() => Promise.resolve(rows));
  const onConflictDoUpdate = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoUpdate }));

  return {
    query: { values },
    values,
    onConflictDoUpdate,
    returning,
  };
}

const section = {
  id: "section-1",
  key: "background",
  title: "Background",
  description: "Case background",
  sortOrder: 1,
  active: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const activeQuestion = {
  id: "question-1",
  sectionId: "section-1",
  key: "met_in_person",
  label: "Have you met in person?",
  helpText: null,
  questionType: "boolean",
  required: true,
  sortOrder: 1,
  active: true,
  config: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("questionnaire data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertCaseOwnership.mockResolvedValue({
      id: "case-1",
      userId: "user-1",
    });
  });

  it("creates and reads answers for an owned case", async () => {
    const savedAt = new Date("2026-02-01T00:00:00.000Z");
    const insertQuery = createInsertQuery([
      {
        id: "answer-1",
        caseId: "case-1",
        questionId: "question-1",
        value: true,
        createdAt: savedAt,
        updatedAt: savedAt,
      },
    ]);

    mockDb.select
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(createSelectQuery([section]))
      .mockReturnValueOnce(createSelectQuery([section]))
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(
        createSelectQuery([
          {
            id: "answer-1",
            caseId: "case-1",
            questionId: "question-1",
            value: true,
            createdAt: savedAt,
            updatedAt: savedAt,
          },
        ]),
      )
      .mockReturnValueOnce(createSelectQuery([]));
    mockDb.insert.mockReturnValueOnce(insertQuery.query);

    await expect(
      upsertQuestionnaireAnswer("case-1", "met_in_person", true),
    ).resolves.toMatchObject({
      caseId: "case-1",
      questionId: "question-1",
      questionKey: "met_in_person",
      value: true,
    });

    await expect(getQuestionnaireForCase("case-1")).resolves.toMatchObject({
      sections: [
        {
          key: "background",
          questions: [{ key: "met_in_person" }],
        },
      ],
      answers: [
        {
          caseId: "case-1",
          questionKey: "met_in_person",
          value: true,
        },
      ],
      state: null,
    });
  });

  it("upserts answers instead of inserting duplicate case/question rows", async () => {
    const updatedAt = new Date("2026-02-01T00:00:00.000Z");
    const insertQuery = createInsertQuery([
      {
        id: "answer-1",
        caseId: "case-1",
        questionId: "question-1",
        value: "updated",
        createdAt: updatedAt,
        updatedAt,
      },
    ]);

    mockDb.select
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(createSelectQuery([section]));
    mockDb.insert.mockReturnValueOnce(insertQuery.query);

    await upsertQuestionnaireAnswer("case-1", "met_in_person", "updated");

    expect(insertQuery.onConflictDoUpdate).toHaveBeenCalledTimes(1);
    expect(insertQuery.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ value: "updated" }),
      }),
    );
  });

  it("rejects unowned cases before reading questionnaire data", async () => {
    mockAssertCaseOwnership.mockRejectedValueOnce(new Error("Unauthorized"));

    await expect(getQuestionnaireForCase("case-2")).rejects.toThrow(
      "Unauthorized",
    );

    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("creates review state for an owned case", async () => {
    const completedAt = new Date("2026-02-01T00:00:00.000Z");
    const updatedAt = new Date("2026-02-02T00:00:00.000Z");
    const insertQuery = createInsertQuery([
      {
        id: "state-1",
        caseId: "case-1",
        completedAt,
        reviewedAt: null,
        reviewStatus: "in_review",
        createdAt: completedAt,
        updatedAt,
      },
    ]);

    mockDb.insert.mockReturnValueOnce(insertQuery.query);

    await expect(
      updateQuestionnaireCaseState("case-1", {
        completedAt,
        reviewStatus: "in_review",
      }),
    ).resolves.toMatchObject({
      caseId: "case-1",
      completedAt,
      reviewedAt: null,
      reviewStatus: "in_review",
      updatedAt,
    });
  });

  it("reads review state for an owned case", async () => {
    const completedAt = new Date("2026-02-01T00:00:00.000Z");
    const reviewedAt = new Date("2026-02-02T00:00:00.000Z");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery([section]))
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(
        createSelectQuery([
          {
            id: "state-1",
            caseId: "case-1",
            completedAt,
            reviewedAt,
            reviewStatus: "approved",
            createdAt: completedAt,
            updatedAt: reviewedAt,
          },
        ]),
      );

    await expect(getQuestionnaireForCase("case-1")).resolves.toMatchObject({
      state: {
        caseId: "case-1",
        completedAt,
        reviewedAt,
        reviewStatus: "approved",
        updatedAt: reviewedAt,
      },
    });
  });

  it("does not write answers for inactive or missing questions", async () => {
    mockDb.select.mockReturnValueOnce(createSelectQuery([]));

    await expect(
      upsertQuestionnaireAnswer("case-1", "inactive_question", "value"),
    ).rejects.toThrow("Questionnaire question not found.");

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("does not write answers for questions in inactive sections", async () => {
    mockDb.select
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      upsertQuestionnaireAnswer("case-1", "met_in_person", "value"),
    ).rejects.toThrow("Questionnaire question not found.");

    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
