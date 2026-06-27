import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  dbMock,
  getQuestionnaireForCaseMock,
  updateCaseProgressMock,
  updateQuestionnaireCaseStateMock,
} = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
  getQuestionnaireForCaseMock: vi.fn(),
  updateCaseProgressMock: vi.fn(),
  updateQuestionnaireCaseStateMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: dbMock,
}));

vi.mock("@/features/cases/server/cases", () => ({
  updateCaseProgress: updateCaseProgressMock,
}));

vi.mock("@/features/questionnaire/server/questionnaire", () => ({
  getQuestionnaireForCase: getQuestionnaireForCaseMock,
  updateQuestionnaireCaseState: updateQuestionnaireCaseStateMock,
}));

import {
  saveBeneficiary,
  saveChildren,
  savePetitioner,
  updateCaseTitle,
} from "@/features/cases/server/forms";

function queueSelectResult(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  };

  dbMock.select.mockReturnValueOnce(chain);
  return chain;
}

function createTransactionSelectResult(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    for: vi.fn().mockResolvedValue(rows),
    then: (resolve: (value: unknown[]) => unknown) =>
      Promise.resolve(rows).then(resolve),
  };

  return chain;
}

function queueUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  dbMock.update.mockReturnValueOnce({ set });
  return { set, where };
}

function queueInsert() {
  const values = vi.fn().mockResolvedValue(undefined);
  dbMock.insert.mockReturnValueOnce({ values });
  return { values };
}

function formDataFrom(entries: [string, string][]) {
  const formData = new FormData();

  for (const [key, value] of entries) {
    formData.append(key, value);
  }

  return formData;
}

function buildPersonForm(overrides: Record<string, string> = {}) {
  return formDataFrom(
    Object.entries({
      firstName: "Tyler",
      middleName: "",
      lastName: "Akins",
      dateOfBirth: "1990-01-01",
      countryOfBirth: "United States",
      citizenship: "United States",
      email: "tyler@example.com",
      phone: "555-111-2222",
      street1: "123 Main St",
      street2: "",
      city: "Austin",
      state: "TX",
      province: "Texas",
      postalCode: "78701",
      country: "United States",
      ...overrides,
    }),
  );
}

describe("case form persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getQuestionnaireForCaseMock.mockResolvedValue({
      progress: { percent: 50 },
      state: null,
    });
    updateCaseProgressMock.mockResolvedValue({ progressPercent: 42 });
  });

  it("rejects invalid case titles", async () => {
    const formData = formDataFrom([["title", "x"]]);

    await expect(updateCaseTitle("case-1", formData)).resolves.toEqual({
      success: false,
      error: "Please enter a valid case name.",
    });
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it("updates valid case titles and returns progress", async () => {
    const update = queueUpdate();
    const formData = formDataFrom([["title", "Tyler & Van"]]);

    await expect(updateCaseTitle("case-1", formData)).resolves.toEqual({
      success: true,
      progressPercent: 42,
    });
    expect(update.set).toHaveBeenCalledWith(expect.objectContaining({
      title: "Tyler & Van",
      updatedAt: expect.any(Date),
    }));
    expect(updateCaseProgressMock).toHaveBeenCalledWith("case-1", 0.5);
  });

  it("inserts a petitioner when none exists", async () => {
    queueSelectResult([]);
    const insert = queueInsert();

    await expect(savePetitioner("case-1", buildPersonForm())).resolves.toEqual({
      success: true,
      progressPercent: 42,
    });
    expect(insert.values).toHaveBeenCalledWith(expect.objectContaining({
      caseId: "case-1",
      firstName: "Tyler",
      dateOfBirth: expect.any(Date),
      updatedAt: expect.any(Date),
    }));
  });

  it("updates a beneficiary when one exists", async () => {
    queueSelectResult([{ id: "beneficiary-1" }]);
    const update = queueUpdate();

    await expect(saveBeneficiary("case-1", buildPersonForm({
      firstName: "Van",
      lastName: "Nguyen",
      countryOfBirth: "Vietnam",
      citizenship: "Vietnam",
      province: "",
    }))).resolves.toEqual({
      success: true,
      progressPercent: 42,
    });
    expect(update.set).toHaveBeenCalledWith(expect.objectContaining({
      caseId: "case-1",
      firstName: "Van",
      dateOfBirth: expect.any(Date),
    }));
  });

  it("rejects invalid person forms before writing", async () => {
    const result = await savePetitioner("case-1", buildPersonForm({
      email: "not-an-email",
    }));

    expect(result).toEqual({
      success: false,
      error: "Please fix the highlighted fields.",
    });
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("removes existing children when the user has no K-2 children", async () => {
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    const select = vi
      .fn()
      .mockReturnValueOnce(createTransactionSelectResult([{ id: "case-1" }]))
      .mockReturnValueOnce(createTransactionSelectResult([{ id: "child-1" }]));
    dbMock.transaction.mockImplementationOnce(async (callback) =>
      callback({
        select,
        delete: vi.fn(() => ({ where: deleteWhere })),
        update: vi.fn(() => ({ set: updateSet })),
      }),
    );
    const formData = formDataFrom([["hasChildren", "no"]]);

    await expect(saveChildren("case-1", formData)).resolves.toEqual({
      success: true,
      progressPercent: 42,
    });
    expect(deleteWhere).toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      childrenReviewed: true,
      updatedAt: expect.any(Date),
    }));
  });

  it("rejects invalid child counts", async () => {
    const formData = formDataFrom([
      ["hasChildren", "yes"],
      ["childCount", "0"],
    ]);

    await expect(saveChildren("case-1", formData)).resolves.toMatchObject({
      success: false,
      fieldErrors: { childCount: ["Select between one and ten children."] },
    });
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it("rejects incomplete child records", async () => {
    const formData = formDataFrom([
      ["hasChildren", "yes"],
      ["childCount", "1"],
      ["children.0.firstName", "Kai"],
      ["children.0.middleName", ""],
      ["children.0.lastName", "Nguyen"],
      ["children.0.dateOfBirth", "not-a-date"],
      ["children.0.citizenship", "Vietnam"],
      ["children.0.relationshipType", "child"],
    ]);

    await expect(saveChildren("case-1", formData)).resolves.toMatchObject({
      success: false,
      error: "Please complete each K-2 child record.",
    });
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it("reconciles valid child records in a transaction", async () => {
    const txInsertValues = vi.fn().mockResolvedValue(undefined);
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    const select = vi
      .fn()
      .mockReturnValueOnce(createTransactionSelectResult([{ id: "case-1" }]))
      .mockReturnValueOnce(createTransactionSelectResult([]));
    dbMock.transaction.mockImplementationOnce(async (callback) =>
      callback({
        select,
        insert: vi.fn(() => ({ values: txInsertValues })),
        update: vi.fn(() => ({ set: updateSet })),
      }),
    );
    const formData = formDataFrom([
      ["hasChildren", "yes"],
      ["childCount", "1"],
      ["children.0.firstName", "Kai"],
      ["children.0.middleName", ""],
      ["children.0.lastName", "Nguyen"],
      ["children.0.dateOfBirth", "2018-01-01"],
      ["children.0.countryOfBirth", "Vietnam"],
      ["children.0.citizenship", "Vietnam"],
      ["children.0.relationshipType", "Child"],
      ["children.0.residesWithBeneficiary", "yes"],
    ]);

    await expect(saveChildren("case-1", formData)).resolves.toEqual({
      success: true,
      progressPercent: 42,
    });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-1",
        firstName: "Kai",
        dateOfBirth: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      childrenReviewed: true,
    }));
  });

  it("rejects child identifiers outside the locked case", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(createTransactionSelectResult([{ id: "case-1" }]))
      .mockReturnValueOnce(
        createTransactionSelectResult([
          { id: "11111111-1111-4111-8111-111111111111" },
        ]),
      );
    const update = vi.fn();
    dbMock.transaction.mockImplementationOnce(async (callback) =>
      callback({ select, update }),
    );
    const formData = formDataFrom([
      ["hasChildren", "yes"],
      ["childCount", "1"],
      ["children.0.id", "22222222-2222-4222-8222-222222222222"],
      ["children.0.firstName", "Kai"],
      ["children.0.middleName", ""],
      ["children.0.lastName", "Nguyen"],
      ["children.0.dateOfBirth", "2018-01-01"],
      ["children.0.countryOfBirth", "Vietnam"],
      ["children.0.citizenship", "Vietnam"],
      ["children.0.relationshipType", "Child"],
      ["children.0.residesWithBeneficiary", "yes"],
    ]);

    await expect(saveChildren("case-1", formData)).resolves.toMatchObject({
      success: false,
      error: "One or more child records do not belong to this case.",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("sets questionnaire completion when children finish the last section", async () => {
    getQuestionnaireForCaseMock.mockResolvedValue({
      progress: { percent: 100 },
      state: null,
    });
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    const select = vi
      .fn()
      .mockReturnValueOnce(createTransactionSelectResult([{ id: "case-1" }]))
      .mockReturnValueOnce(createTransactionSelectResult([]));
    dbMock.transaction.mockImplementationOnce(async (callback) =>
      callback({ select, update: vi.fn(() => ({ set: updateSet })) }),
    );

    await saveChildren("case-1", formDataFrom([["hasChildren", "no"]]));

    expect(updateQuestionnaireCaseStateMock).toHaveBeenCalledWith("case-1", {
      completedAt: expect.any(Date),
    });
  });
});
