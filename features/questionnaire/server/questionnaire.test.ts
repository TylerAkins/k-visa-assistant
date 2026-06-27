import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockAssertCaseOwnership, mockDb, mockGetPhase2CaseProgress } = vi.hoisted(() => ({
  mockAssertCaseOwnership: vi.fn(),
  mockGetPhase2CaseProgress: vi.fn(),
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@/features/cases/server/cases", () => ({
  assertCaseOwnership: mockAssertCaseOwnership,
  getPhase2CaseProgress: mockGetPhase2CaseProgress,
}));

import {
  getQuestionnaireForCase,
  listQuestionnaireDefinition,
  saveQuestionnaireSectionAnswers,
  updateQuestionnaireCaseState,
} from "@/features/questionnaire/server/questionnaire";

function createSelectQuery<T>(rows: T[]) {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    orderBy: vi.fn(() => Promise.resolve(rows)),
    limit: vi.fn(() => Promise.resolve(rows)),
    for: vi.fn(() => Promise.resolve(rows)),
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

function createTransactionQuery({
  currentAnswers = [],
  currentState = [],
}: {
  currentAnswers?: unknown[];
  currentState?: unknown[];
} = {}) {
  const deleteWhere = vi.fn(() => Promise.resolve());
  const deleteAnswer = vi.fn(() => ({ where: deleteWhere }));
  const onConflictDoUpdate = vi.fn(() => Promise.resolve());
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insertAnswer = vi.fn(() => ({ values }));
  const lockQuery = createSelectQuery([{ id: "case-1" }]);
  const select = vi
    .fn()
    .mockReturnValueOnce(lockQuery)
    .mockReturnValueOnce(createSelectQuery(currentAnswers))
    .mockReturnValueOnce(createSelectQuery(currentState));
  const updateWhere = vi.fn(() => Promise.resolve());
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const updateCase = vi.fn(() => ({ set: updateSet }));
  const transactionClient = {
    delete: deleteAnswer,
    insert: insertAnswer,
    select,
    update: updateCase,
  };

  mockDb.transaction.mockImplementationOnce(
    async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );

  return {
    deleteAnswer,
    deleteWhere,
    insertAnswer,
    lockQuery,
    onConflictDoUpdate,
    select,
    updateCase,
    updateSet,
    updateWhere,
    values,
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

const petitionerOtherNamesQuestion = {
  ...activeQuestion,
  id: "question-petitioner-other-names",
  key: "petitioner_other_names",
  label: "Other names used",
  helpText: "List prior legal names, aliases, or maiden names.",
  questionType: "textarea",
  required: false,
  sortOrder: 10,
};

const petitionerCitizenshipBasisQuestion = {
  ...activeQuestion,
  id: "question-petitioner-citizenship-basis",
  key: "petitioner_citizenship_basis",
  label: "Citizenship basis",
  questionType: "select",
  required: true,
  sortOrder: 20,
  config: {
    options: [
      { label: "Birth in the United States", value: "birth_us" },
      { label: "Naturalization", value: "naturalization" },
      { label: "Certificate of citizenship", value: "certificate" },
    ],
  },
};

const beneficiaryCurrentlyInUsQuestion = {
  ...activeQuestion,
  id: "question-beneficiary-currently-in-us",
  sectionId: "section-beneficiary",
  key: "beneficiary_currently_in_us",
  label: "Is the beneficiary currently in the United States?",
  required: true,
  sortOrder: 10,
};

const beneficiaryPassportNumberQuestion = {
  ...activeQuestion,
  id: "question-beneficiary-passport-number",
  sectionId: "section-beneficiary",
  key: "beneficiary_passport_number",
  label: "Passport number",
  questionType: "text",
  required: true,
  sortOrder: 20,
  config: {
    visibleWhen: {
      questionKey: "beneficiary_currently_in_us",
      equals: true,
    },
  },
};

const beneficiaryPassportExpirationQuestion = {
  ...activeQuestion,
  id: "question-beneficiary-passport-expiration",
  sectionId: "section-beneficiary",
  key: "beneficiary_passport_expiration",
  label: "Passport expiration date",
  questionType: "date",
  required: true,
  sortOrder: 30,
  config: {
    visibleWhen: {
      questionKey: "beneficiary_currently_in_us",
      equals: true,
    },
  },
};

const beneficiaryQuestions = [
  beneficiaryCurrentlyInUsQuestion,
  beneficiaryPassportNumberQuestion,
  beneficiaryPassportExpirationQuestion,
];

describe("questionnaire data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertCaseOwnership.mockResolvedValue({
      id: "case-1",
      userId: "user-1",
    });
    mockGetPhase2CaseProgress.mockResolvedValue({
      progressPercent: 70,
      userId: "user-1",
    });
  });

  it("creates and reloads petitioner answers for an owned case", async () => {
    const savedAt = new Date("2026-02-01T00:00:00.000Z");
    const transaction = createTransactionQuery();
    const formData = new FormData();
    formData.set("petitioner_other_names", "  Taylor Previous  ");
    formData.set("petitioner_citizenship_basis", "naturalization");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(
        createSelectQuery([
          petitionerOtherNamesQuestion,
          petitionerCitizenshipBasisQuestion,
        ]),
      )
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(
        createSelectQuery([
          petitionerOtherNamesQuestion,
          petitionerCitizenshipBasisQuestion,
        ]),
      )
      .mockReturnValueOnce(
        createSelectQuery([
          {
            id: "answer-other-names",
            caseId: "case-1",
            questionId: "question-petitioner-other-names",
            value: "Taylor Previous",
            createdAt: savedAt,
            updatedAt: savedAt,
          },
          {
            id: "answer-citizenship-basis",
            caseId: "case-1",
            questionId: "question-petitioner-citizenship-basis",
            value: "naturalization",
            createdAt: savedAt,
            updatedAt: savedAt,
          },
        ]),
      )
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toMatchObject({
      success: true,
      progressPercent: 78,
      questionnaireProgress: {
        completedSections: 1,
        totalSections: 4,
        percent: 25,
      },
    });

    expect(transaction.values).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-1",
        questionId: "question-petitioner-other-names",
        value: "Taylor Previous",
      }),
    );
    expect(transaction.values).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-1",
        questionId: "question-petitioner-citizenship-basis",
        value: "naturalization",
      }),
    );
    expect(transaction.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ progressPercent: 78 }),
    );

    const questionnaire = await getQuestionnaireForCase("case-1");

    expect(questionnaire.sections).toHaveLength(4);
    expect(questionnaire.sections[0]).toMatchObject({
      key: "petitioner",
      sortOrder: 10,
      questions: [
        { key: "petitioner_other_names", sortOrder: 10 },
        { key: "petitioner_citizenship_basis", sortOrder: 20 },
      ],
    });
    expect(questionnaire.answers).toEqual([
      expect.objectContaining({
        caseId: "case-1",
        questionKey: "petitioner_other_names",
        value: "Taylor Previous",
      }),
      expect.objectContaining({
        caseId: "case-1",
        questionKey: "petitioner_citizenship_basis",
        value: "naturalization",
      }),
    ]);
    expect(questionnaire.state).toBeNull();
    expect(questionnaire.progress).toMatchObject({
      completedSections: 1,
      totalSections: 4,
      percent: 25,
    });
  });

  it("creates and reloads beneficiary answers for an owned case", async () => {
    const savedAt = new Date("2026-02-01T00:00:00.000Z");
    const transaction = createTransactionQuery();
    const formData = new FormData();
    formData.set("beneficiary_currently_in_us", "true");
    formData.set("beneficiary_passport_number", "  X1234567  ");
    formData.set("beneficiary_passport_expiration", "2030-06-15");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery(beneficiaryQuestions))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery(beneficiaryQuestions))
      .mockReturnValueOnce(
        createSelectQuery([
          {
            id: "answer-beneficiary-currently-in-us",
            caseId: "case-1",
            questionId: "question-beneficiary-currently-in-us",
            value: true,
            createdAt: savedAt,
            updatedAt: savedAt,
          },
          {
            id: "answer-beneficiary-passport-number",
            caseId: "case-1",
            questionId: "question-beneficiary-passport-number",
            value: "X1234567",
            createdAt: savedAt,
            updatedAt: savedAt,
          },
          {
            id: "answer-beneficiary-passport-expiration",
            caseId: "case-1",
            questionId: "question-beneficiary-passport-expiration",
            value: "2030-06-15",
            createdAt: savedAt,
            updatedAt: savedAt,
          },
        ]),
      )
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "beneficiary", formData),
    ).resolves.toMatchObject({
      success: true,
      progressPercent: 78,
      questionnaireProgress: {
        completedSections: 1,
        totalSections: 4,
        percent: 25,
      },
    });

    expect(transaction.values).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: "question-beneficiary-currently-in-us",
        value: true,
      }),
    );
    expect(transaction.values).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: "question-beneficiary-passport-number",
        value: "X1234567",
      }),
    );
    expect(transaction.values).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: "question-beneficiary-passport-expiration",
        value: "2030-06-15",
      }),
    );

    const questionnaire = await getQuestionnaireForCase("case-1");

    expect(questionnaire.sections[1]).toMatchObject({
      key: "beneficiary",
      sortOrder: 20,
      questions: [
        { key: "beneficiary_currently_in_us", sortOrder: 10 },
        { key: "beneficiary_passport_number", sortOrder: 20 },
        { key: "beneficiary_passport_expiration", sortOrder: 30 },
      ],
    });
    expect(questionnaire.answers).toEqual([
      expect.objectContaining({
        questionKey: "beneficiary_currently_in_us",
        value: true,
      }),
      expect.objectContaining({
        questionKey: "beneficiary_passport_number",
        value: "X1234567",
      }),
      expect.objectContaining({
        questionKey: "beneficiary_passport_expiration",
        value: "2030-06-15",
      }),
    ]);
  });

  it("uses locked authoritative answers to set full questionnaire progress", async () => {
    const formData = new FormData();
    formData.set("met_in_person", "true");
    const optionalQuestions = [
      ["section-beneficiary", "beneficiary_notes"],
      ["section-relationship", "relationship_notes"],
      ["section-children", "children_notes"],
    ].map(([sectionId, key], index) => ({
      ...activeQuestion,
      id: `question-${index + 2}`,
      sectionId,
      key,
      label: key,
      questionType: "text",
      required: false,
      sortOrder: 1,
    }));
    const savedAt = new Date("2026-02-01T00:00:00.000Z");
    const currentAnswers = optionalQuestions.map((question) => ({
      id: `answer-${question.id}`,
      caseId: "case-1",
      questionId: question.id,
      value: null,
      createdAt: savedAt,
      updatedAt: savedAt,
    }));
    const transaction = createTransactionQuery({ currentAnswers });

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(
        createSelectQuery([activeQuestion, ...optionalQuestions]),
      )
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toMatchObject({
      success: true,
      progressPercent: 100,
      questionnaireProgress: { completedSections: 4, percent: 100 },
    });

    expect(transaction.values).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-1",
        completedAt: expect.any(Date),
        reviewStatus: "not_started",
      }),
    );
    expect(transaction.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ progressPercent: 100 }),
    );
    expect(transaction.lockQuery.for).toHaveBeenCalledWith("update");
    expect(transaction.select).toHaveBeenCalledTimes(3);
  });

  it("clears stale questionnaire completion when sections are incomplete", async () => {
    const formData = new FormData();
    formData.set("met_in_person", "true");
    const completedAt = new Date("2026-02-01T00:00:00.000Z");
    const currentState = [
      {
        id: "state-1",
        caseId: "case-1",
        completedAt,
        reviewedAt: null,
        reviewStatus: "not_started",
        createdAt: completedAt,
        updatedAt: completedAt,
      },
    ];
    const transaction = createTransactionQuery({ currentState });

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
            reviewedAt: null,
            reviewStatus: "not_started",
            createdAt: completedAt,
            updatedAt: completedAt,
          },
        ]),
      );

    await saveQuestionnaireSectionAnswers("case-1", "petitioner", formData);

    expect(transaction.values).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: "case-1", completedAt: null }),
    );
  });

  it("upserts answers instead of inserting duplicate case/question rows", async () => {
    const transaction = createTransactionQuery();
    const savedAt = new Date("2026-02-01T00:00:00.000Z");
    const formData = new FormData();
    formData.set("met_in_person", "false");

    mockDb.select
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

    await saveQuestionnaireSectionAnswers("case-1", "petitioner", formData);

    expect(transaction.onConflictDoUpdate).toHaveBeenCalledTimes(2);
    expect(transaction.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ value: false }),
      }),
    );
  });

  it("saves section answers using stable question keys", async () => {
    const transaction = createTransactionQuery();
    const formData = new FormData();
    formData.set("met_in_person", "true");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery([activeQuestion]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toMatchObject({ success: true, progressPercent: 78 });

    expect(transaction.values).toHaveBeenCalledWith(
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
      fieldErrors: {
        met_in_person: ['Choose yes or no for "Have you met in person?".'],
      },
    });

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("rejects a missing required petitioner answer before writing", async () => {
    const formData = new FormData();
    formData.set("petitioner_other_names", "Taylor Previous");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(
        createSelectQuery([
          petitionerOtherNamesQuestion,
          petitionerCitizenshipBasisQuestion,
        ]),
      )
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toEqual({
      success: false,
      fieldErrors: {
        petitioner_citizenship_basis: [
          'Please answer "Citizenship basis" before saving.',
        ],
      },
    });

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("rejects a missing required beneficiary presence answer before writing", async () => {
    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery(beneficiaryQuestions))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers(
        "case-1",
        "beneficiary",
        new FormData(),
      ),
    ).resolves.toEqual({
      success: false,
      fieldErrors: {
        beneficiary_currently_in_us: [
          'Please answer "Is the beneficiary currently in the United States?" before saving.',
        ],
      },
    });

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("requires passport answers when the beneficiary is in the US", async () => {
    const formData = new FormData();
    formData.set("beneficiary_currently_in_us", "true");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery(beneficiaryQuestions))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "beneficiary", formData),
    ).resolves.toEqual({
      success: false,
      fieldErrors: {
        beneficiary_passport_number: [
          'Please answer "Passport number" before saving.',
        ],
        beneficiary_passport_expiration: [
          'Please answer "Passport expiration date" before saving.',
        ],
      },
    });

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid beneficiary passport expiration before writing", async () => {
    const formData = new FormData();
    formData.set("beneficiary_currently_in_us", "true");
    formData.set("beneficiary_passport_number", "X1234567");
    formData.set("beneficiary_passport_expiration", "2030-02-30");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery(beneficiaryQuestions))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "beneficiary", formData),
    ).resolves.toEqual({
      success: false,
      fieldErrors: {
        beneficiary_passport_expiration: [
          'Enter a valid date for "Passport expiration date".',
        ],
      },
    });

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("clears passport answers when the beneficiary is not in the US", async () => {
    const savedAt = new Date("2026-02-01T00:00:00.000Z");
    const savedPassportAnswers = [
      {
        id: "answer-beneficiary-passport-number",
        caseId: "case-1",
        questionId: "question-beneficiary-passport-number",
        value: "X1234567",
        createdAt: savedAt,
        updatedAt: savedAt,
      },
      {
        id: "answer-beneficiary-passport-expiration",
        caseId: "case-1",
        questionId: "question-beneficiary-passport-expiration",
        value: "2030-06-15",
        createdAt: savedAt,
        updatedAt: savedAt,
      },
    ];
    const transaction = createTransactionQuery({
      currentAnswers: savedPassportAnswers,
    });
    const formData = new FormData();
    formData.set("beneficiary_currently_in_us", "false");
    formData.set("beneficiary_passport_number", "ignored");
    formData.set("beneficiary_passport_expiration", "not-a-date");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery(beneficiaryQuestions))
      .mockReturnValueOnce(createSelectQuery(savedPassportAnswers))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "beneficiary", formData),
    ).resolves.toMatchObject({
      success: true,
      progressPercent: 78,
      questionnaireProgress: {
        completedSections: 1,
        totalSections: 4,
        percent: 25,
      },
    });

    expect(transaction.deleteWhere).toHaveBeenCalledTimes(2);
    expect(transaction.values).toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: "question-beneficiary-currently-in-us",
        value: false,
      }),
    );
    expect(transaction.values).not.toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: "question-beneficiary-passport-number",
      }),
    );
    expect(transaction.values).not.toHaveBeenCalledWith(
      expect.objectContaining({
        questionId: "question-beneficiary-passport-expiration",
      }),
    );
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
      fieldErrors: {
        citizenship_basis: [
          'Choose a valid option for "Citizenship basis".',
        ],
      },
    });

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("does not clear hidden answers when another visible answer is invalid", async () => {
    const requiredSelectQuestion = {
      ...activeQuestion,
      id: "question-select",
      key: "citizenship_basis",
      label: "Citizenship basis",
      questionType: "select",
      sortOrder: 3,
      config: {
        options: [{ label: "Naturalization", value: "naturalization" }],
      },
    };
    const formData = new FormData();
    formData.set("met_in_person", "true");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(
        createSelectQuery([
          activeQuestion,
          waiverQuestion,
          requiredSelectQuestion,
        ]),
      )
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toEqual({
      success: false,
      fieldErrors: {
        citizenship_basis: [
          'Please answer "Citizenship basis" before saving.',
        ],
      },
    });

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("does not require hidden conditional questions", async () => {
    const transaction = createTransactionQuery();
    const formData = new FormData();
    formData.set("met_in_person", "true");

    mockDb.select
      .mockReturnValueOnce(createSelectQuery(completeSections))
      .mockReturnValueOnce(createSelectQuery([activeQuestion, waiverQuestion]))
      .mockReturnValueOnce(createSelectQuery([]))
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toMatchObject({ success: true, progressPercent: 78 });

    expect(transaction.deleteWhere).toHaveBeenCalledTimes(1);
    expect(transaction.values).toHaveBeenCalledWith(
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
      fieldErrors: {
        meeting_waiver_explanation: [
          'Please answer "Meeting waiver explanation" before saving.',
        ],
      },
    });

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("clears stale hidden answers and ignores hidden posted values", async () => {
    const hiddenDateQuestion = {
      ...waiverQuestion,
      label: "Hidden date",
      questionType: "date",
    };
    const savedAt = new Date("2026-02-01T00:00:00.000Z");
    const transaction = createTransactionQuery();
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
      .mockReturnValueOnce(createSelectQuery([]));

    await expect(
      saveQuestionnaireSectionAnswers("case-1", "petitioner", formData),
    ).resolves.toMatchObject({ success: true, progressPercent: 78 });

    expect(transaction.deleteWhere).toHaveBeenCalledTimes(1);
    expect(transaction.values).toHaveBeenCalledWith(
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

  it("rejects unowned cases before writing questionnaire data", async () => {
    mockAssertCaseOwnership.mockRejectedValueOnce(new Error("Unauthorized"));

    await expect(
      saveQuestionnaireSectionAnswers(
        "case-2",
        "petitioner",
        new FormData(),
      ),
    ).rejects.toThrow("Unauthorized");

    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
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
