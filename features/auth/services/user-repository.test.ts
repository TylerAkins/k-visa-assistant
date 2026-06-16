import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

import {
  createEmailVerificationToken,
  createPasswordResetToken,
  findUserByEmail,
  markRecoveryCodeUsed,
} from "@/features/auth/services/user-repository";

describe("user-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds user by email", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "user-1", email: "a@b.com" }]),
        }),
      }),
    });

    const user = await findUserByEmail("a@b.com");
    expect(user?.id).toBe("user-1");
  });

  it("returns null when user is missing", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(findUserByEmail("missing@example.com")).resolves.toBeNull();
  });

  it("creates email verification token", async () => {
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const token = await createEmailVerificationToken("user-1");
    expect(token.length).toBeGreaterThan(20);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("creates password reset token", async () => {
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const token = await createPasswordResetToken("user-1");
    expect(token.length).toBeGreaterThan(20);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("returns false when recovery code already used", async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(markRecoveryCodeUsed("code-1")).resolves.toBe(false);
  });

  it("marks recovery code used atomically", async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "code-1" }]),
        }),
      }),
    });

    await expect(markRecoveryCodeUsed("code-1")).resolves.toBe(true);
  });
});
