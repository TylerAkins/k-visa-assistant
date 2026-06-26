import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, getCurrentUserMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  getCurrentUserMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: dbMock,
}));

vi.mock("@/features/auth/server/session", () => ({
  getCurrentUser: getCurrentUserMock,
}));

import {
  assertCaseOwnership,
  createCase,
  getCaseOverview,
  listUserCases,
  requireVerifiedUser,
  updateCaseProgress,
} from "@/features/cases/server/cases";

function queueSelectResult(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn().mockResolvedValue(rows),
    limit: vi.fn().mockResolvedValue(rows),
  };

  dbMock.select.mockReturnValueOnce(chain);
  return chain;
}

function queueInsertReturning(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn(() => ({ returning }));
  dbMock.insert.mockReturnValueOnce({ values });
  return { values, returning };
}

function queueUpdateReturning(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  dbMock.update.mockReturnValueOnce({ set });
  return { set, where, returning };
}

const verifiedUser = {
  id: "user-1",
  email: "user@example.com",
  emailVerified: true,
};

const completePerson = {
  id: "person-1",
  caseId: "case-1",
  firstName: "Tyler",
  middleName: null,
  lastName: "Akins",
  dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
  countryOfBirth: "United States",
  citizenship: "United States",
  email: "tyler@example.com",
  phone: "555-111-2222",
  street1: "123 Main St",
  street2: null,
  city: "Austin",
  state: "TX",
  postalCode: "78701",
  country: "United States",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("case server helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(verifiedUser);
  });

  it("requires a verified signed-in user", async () => {
    await expect(requireVerifiedUser()).resolves.toBe(verifiedUser);

    getCurrentUserMock.mockResolvedValueOnce(null);
    await expect(requireVerifiedUser()).rejects.toThrow(
      "Unauthorized access to case data.",
    );

    getCurrentUserMock.mockResolvedValueOnce({
      ...verifiedUser,
      emailVerified: false,
    });
    await expect(requireVerifiedUser()).rejects.toThrow(
      "Unauthorized access to case data.",
    );
  });

  it("scopes ownership checks to the current user", async () => {
    queueSelectResult([{ id: "case-1", userId: "user-1" }]);

    await expect(assertCaseOwnership("case-1")).resolves.toEqual({
      id: "case-1",
      userId: "user-1",
    });

    expect(dbMock.select).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.anything(),
      userId: expect.anything(),
    }));
  });

  it("rejects ownership checks when no scoped case is found", async () => {
    queueSelectResult([]);

    await expect(assertCaseOwnership("missing-case")).rejects.toThrow(
      "Unauthorized access to case data.",
    );
  });

  it("lists cases for the current verified user", async () => {
    const updatedAt = new Date("2026-02-01T00:00:00.000Z");
    queueSelectResult([
      {
        id: "case-1",
        userId: "user-1",
        title: "Tyler & Van",
        status: "active",
        progressPercent: 25,
        childrenReviewed: false,
        createdAt: updatedAt,
        updatedAt,
      },
    ]);

    await expect(listUserCases()).resolves.toEqual([
      expect.objectContaining({ id: "case-1", status: "active" }),
    ]);
  });

  it("returns case overview data with recalculated progress when stored progress is stale", async () => {
    queueSelectResult([{ id: "case-1", userId: "user-1" }]);
    queueSelectResult([
      {
        id: "case-1",
        userId: "user-1",
        title: "Tyler & Van",
        status: "draft",
        progressPercent: 0,
        childrenReviewed: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    queueSelectResult([completePerson]);
    queueSelectResult([
      {
        ...completePerson,
        id: "person-2",
        firstName: "Van",
        lastName: "Nguyen",
        countryOfBirth: "Vietnam",
        citizenship: "Vietnam",
      },
    ]);
    queueSelectResult([]);

    const overview = await getCaseOverview("case-1");

    expect(overview.case.progressPercent).toBe(70);
    expect(overview.petitioner).toEqual(completePerson);
    expect(overview.children).toEqual([]);
  });

  it("creates a draft case for the supplied user", async () => {
    queueInsertReturning([{ id: "case-1", userId: "user-1", title: "New case" }]);

    await expect(createCase("user-1", "New case")).resolves.toEqual({
      id: "case-1",
      userId: "user-1",
      title: "New case",
    });
  });

  it("throws when case creation returns no row", async () => {
    queueInsertReturning([]);

    await expect(createCase("user-1", "New case")).rejects.toThrow(
      "Unauthorized access to case data.",
    );
  });

  it("updates stored case progress from overview data", async () => {
    queueSelectResult([{ id: "case-1", userId: "user-1" }]);
    queueSelectResult([
      {
        id: "case-1",
        userId: "user-1",
        title: "Tyler & Van",
        status: "draft",
        progressPercent: 0,
        childrenReviewed: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    queueSelectResult([completePerson]);
    queueSelectResult([completePerson]);
    queueSelectResult([]);
    const update = queueUpdateReturning([
      { id: "case-1", progressPercent: 70 },
    ]);

    await expect(updateCaseProgress("case-1")).resolves.toEqual({
      id: "case-1",
      progressPercent: 70,
    });
    expect(update.set).toHaveBeenCalledWith(expect.objectContaining({
      progressPercent: 70,
      updatedAt: expect.any(Date),
    }));
  });
});
