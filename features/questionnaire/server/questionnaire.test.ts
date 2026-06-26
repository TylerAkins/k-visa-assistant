import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockAssertCaseOwnership, mockDb } = vi.hoisted(() => ({
  mockAssertCaseOwnership: vi.fn(),
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
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
  listQuestionnaireDefinition,
  saveQuestionnaireSectionAnswers,
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

function createDeleteQuery() {
  const where = vi.fn(() => Promise.resolve());

  return {
    query: { where },
    where,
  };
}

const petitionerSection = {
  id: "section-petitioner",
  key: "petitioner",
  title: "Database petitioner title",
  description: "Database petitioner description",
  sortOrder: 1,
  active: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const beneficiarySection = {
  ...petitionerSection,
  id: "section-beneficiary",
  key: "beneficiary",
  title: "Database beneficiary title",
  sortOrder: 2,
};

const relationshipSection = {
  ...petitionerSection,
  id: "section-relationship",
  key: "relationship",
  title: "Database relationship title",
  sortOrder: 3,
};

const childrenSection = {
  ...petitionerSection,
  id: "section-children",
  key: "children",
  title: "Database children title",
  sortOrder: 4,
};

const completeSections = [
  petitionerSection,
  beneficiarySection,
  relationshipSection,
  childrenSection,
];

const activeQuestion = {
  id: "question-1",
  sectionId: "section-petitioner",
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

const waiverQuestion = {
  ...activeQuestion,
  id: "question-waiver",
  key: "meeting_waiver_explanation",
  label: "Meeting waiver explanation",
  questionType: "textarea",
  required: true,
  sortOrder: 2,
  config: {
    visibleWhen: {
      questionKey: "met_in_person",
      equals: false,
    },
  },
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
      .mockReturnValueOnce(createSelectQuery([petitionerSection]))
      .mockReturnValueOnce(createSelectQuery(completeSections))
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

    const questionnaire = await getQuestionnaireForCase("case-1");

    expect(questionnaire.sections).toHaveLength(4);
    expect(questionnaire.sections[0]).toMatchObject({
      key: "petitioner",
      sortOrder: 10,
      questions: [{ key: "met_in_person" }],
    });
    expect(questionnaire.answers).toEqual([
      expect.objectContaining({
        caseId: "case-1",
        questionKey: "met_in_person",
        value: true,
      }),
    ]);
    expect(questionnaire.state).toBeNull();
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
      .mockReturnValueOnce(createSelectQuery([petitionerSection]));
    mockDb.insert.mockReturnValueOnce(insertQuery.query);

    await upsertQuestionnaireAnswer("case-1", "met_in_person", "updated");

    expect(insertQuery.onConflictDoUpdate).toHaveBeenCalledTimes(1);
    expect(insertQuery.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ value: "updated" }),
      }),
    );
  });

  it("saves section answers using stable question keys", async () => {
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
    const formData = new FormData();
    formData.set("met_in_person", "true");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(createSelectQuery([petitionerSection]));
    mockDb.insert.mockReturnValueOnce(insertQuery.query);

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toEqual({ success: true });

    expect(insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-1",
        questionId: "question-1",
        value: true,
      }),
    );
  });

  it("rejects invalid posted values before writing answers", async () => {
    const formData = new FormData();
    formData.set("met_in_person", "maybe");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toEqual({
      success: false,
      error: 'Choose yes or no for "Have you met in person?".',
    });

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("does not partially save earlier answers when a later answer is invalid", async () => {
    const selectQuestion = {
      ...activeQuestion,
      id: "question-2",
      key: "citizenship_basis",
      label: "Citizenship basis",
      questionType: "select",
      sortOrder: 2,
      config: {
        options: [{ label: "Naturalization", value: "naturalization" }],
      },
    };
    const formData = new FormData();
    formData.set("met_in_person", "true");
    formData.set("citizenship_basis", "invalid");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery([activeQuestion, selectQuestion]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toEqual({
      success: false,
      error: 'Choose a valid option for "Citizenship basis".',
    });

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("does not require hidden conditional questions", async () => {
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
    const deleteQuery = createDeleteQuery();
    const formData = new FormData();
    formData.set("met_in_person", "true");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery([activeQuestion, waiverQuestion]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(createSelectQuery([petitionerSection]));
    mockDb.delete.mockReturnValueOnce(deleteQuery.query);
    mockDb.insert.mockReturnValueOnce(insertQuery.query);

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toEqual({ success: true });

    expect(deleteQuery.where).toHaveBeenCalledTimes(1);
    expect(insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-1",
        questionId: "question-1",
        value: true,
      }),
    );
  });

  it("requires visible conditional questions", async () => {
    const formData = new FormData();
    formData.set("met_in_person", "false");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery([activeQuestion, waiverQuestion]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toEqual({
      success: false,
      error: 'Please answer "Meeting waiver explanation" before saving.',
    });

    expect(mockDb.delete).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("clears stale hidden answers and ignores hidden posted values", async () => {
    const hiddenDateQuestion = {
      ...waiverQuestion,
      label: "Hidden date",
      questionType: "date",
    };
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
    const deleteQuery = createDeleteQuery();
    const formData = new FormData();
    formData.set("met_in_person", "true");
    formData.set("meeting_waiver_explanation", "not-a-date");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery([activeQuestion, hiddenDateQuestion]))
      .mockReturnValueOnce(
        createSelectQuery([
          {
            id: "answer-waiver",
            caseId: "case-1",
            questionId: "question-waiver",
            value: "Previously saved waiver.",
            createdAt: savedAt,
            updatedAt: savedAt,
          },
        ]),
      )
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(createSelectQuery([petitionerSection]));
    mockDb.delete.mockReturnValueOnce(deleteQuery.query);
    mockDb.insert.mockReturnValueOnce(insertQuery.query);

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toEqual({ success: true });

    expect(deleteQuery.where).toHaveBeenCalledTimes(1);
    expect(insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: "question-1",
        value: true,
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
      .mockReturnValueOnce(createSelectQuery(completeSections))
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

  it("orders active questionnaire sections by registry order", async () => {
    mockDb.select
      .mockReturnValueOnce(
        createSelectQuery([
          relationshipSection,
          childrenSection,
          petitionerSection,
          beneficiarySection,
        ]),
      )
      .mockReturnValueOnce(createSelectQuery([activeQuestion]));

    await expect(listQuestionnaireDefinition()).resolves.toMatchObject([
      {
        key: "petitioner",
        title: "Petitioner",
        description: "U.S. citizen petitioner information for the case.",
        sortOrder: 10,
      },
      { key: "beneficiary", title: "Beneficiary", sortOrder: 20 },
      { key: "relationship", title: "Relationship", sortOrder: 30 },
      { key: "children", title: "Children", sortOrder: 40 },
    ]);
  });

  it("rejects missing Phase 3 questionnaire section identifiers", async () => {
    mockDb.select.mockReturnValueOnce(
      createSelectQuery([
        petitionerSection,
        beneficiarySection,
        relationshipSection,
      ]),
    );

    await expect(listQuestionnaireDefinition()).rejects.toThrow(
      "Missing questionnaire section identifier(s): children.",
    );

    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown active questionnaire section identifiers", async () => {
    mockDb.select.mockReturnValueOnce(
      createSelectQuery([
        petitionerSection,
        beneficiarySection,
        relationshipSection,
        childrenSection,
        { ...petitionerSection, id: "section-travel", key: "travel" },
      ]),
    );

    await expect(listQuestionnaireDefinition()).rejects.toThrow(
      "Unknown questionnaire section identifier(s): travel.",
    );

    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });

  it("rejects unsupported active question types", async () => {
    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(
        createSelectQuery([{ ...activeQuestion, questionType: "file" }]),
      );

    await expect(listQuestionnaireDefinition()).rejects.toThrow();
  });
});
