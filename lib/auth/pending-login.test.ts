import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockState } = vi.hoisted(() => ({
  mockState: {
    pendingRow: {
      id: "pending-1",
      userId: "user-1",
      attemptCount: 0,
      expiresAt: new Date(Date.now() + 60_000),
    } as {
      id: string;
      userId: string;
      attemptCount: number;
      expiresAt: Date;
    } | null,
  },
}));

vi.mock("@/db", () => ({
  db: {
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "pending-1",
            userId: "user-1",
            attemptCount: 0,
            expiresAt: new Date(Date.now() + 60_000),
          },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ attemptCount: 1 }]),
        }),
      }),
    }),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(async () =>
            mockState.pendingRow ? [mockState.pendingRow] : [],
          ),
        }),
      }),
    })),
  },
}));

import {
  createPendingLogin,
  deletePendingLogin,
  deletePendingLoginsForUser,
  getPendingLogin,
  incrementPendingLoginAttempts,
} from "@/lib/auth/pending-login";

describe("pending-login", () => {
  beforeEach(() => {
    mockState.pendingRow = {
      id: "pending-1",
      userId: "user-1",
      attemptCount: 0,
      expiresAt: new Date(Date.now() + 60_000),
    };
  });

  it("creates a pending login", async () => {
    const pending = await createPendingLogin("user-1");
    expect(pending.id).toBe("pending-1");
  });

  it("loads a valid pending login", async () => {
    const pending = await getPendingLogin("pending-1");
    expect(pending?.userId).toBe("user-1");
  });

  it("returns null for expired pending logins", async () => {
    mockState.pendingRow = {
      id: "pending-1",
      userId: "user-1",
      attemptCount: 0,
      expiresAt: new Date(Date.now() - 60_000),
    };

    await expect(getPendingLogin("pending-1")).resolves.toBeNull();
  });

  it("returns null when attempts are exhausted", async () => {
    mockState.pendingRow = {
      id: "pending-1",
      userId: "user-1",
      attemptCount: 5,
      expiresAt: new Date(Date.now() + 60_000),
    };

    await expect(getPendingLogin("pending-1")).resolves.toBeNull();
  });

  it("returns null when pending login is missing", async () => {
    mockState.pendingRow = null;
    await expect(getPendingLogin("missing")).resolves.toBeNull();
  });

  it("returns max attempts when update returns nothing", async () => {
    const { db } = await import("@/db");
    vi.mocked(db.update).mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as never);

    const count = await incrementPendingLoginAttempts("missing");
    expect(count).toBe(5);
  });

  it("increments attempt count", async () => {
    const count = await incrementPendingLoginAttempts("pending-1");
    expect(count).toBe(1);
  });

  it("reuses valid existing pending login for user", async () => {
    const { db } = await import("@/db");
    vi.mocked(db.insert).mockClear();
    mockState.pendingRow = {
      id: "existing-pending",
      userId: "user-1",
      attemptCount: 1,
      expiresAt: new Date(Date.now() + 60_000),
    };

    const pending = await createPendingLogin("user-1");
    expect(pending.id).toBe("existing-pending");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("deletes pending logins", async () => {
    await deletePendingLogin("pending-1");
    await deletePendingLoginsForUser("user-1");
  });
});
