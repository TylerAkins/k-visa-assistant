import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: {
    APP_URL: "http://localhost:3000",
    EMAIL_PROVIDER: "console",
  },
}));

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/email", () => ({
  getEmailProvider: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/auth/session", () => ({
  deleteUserSessions: vi.fn(),
}));

vi.mock("@/lib/auth/pending-login", () => ({
  deletePendingLoginsForUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/auth/services/user-repository", () => ({
  findUserByEmail: vi.fn(),
  createPasswordResetToken: vi.fn().mockResolvedValue("reset-token"),
}));

import { findUserByEmail } from "@/features/auth/services/user-repository";
import {
  requestPasswordResetService,
  resetPasswordService,
} from "@/features/auth/services/password-reset";
import { generateSecureToken, hashToken } from "@/lib/auth/tokens";

describe("password reset services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transaction.mockImplementation(async (callback) =>
      callback({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    );
  });

  it("returns field errors for invalid email", async () => {
    const result = await requestPasswordResetService({ email: "bad" }, "127.0.0.1");
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns generic message for reset request", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    const result = await requestPasswordResetService(
      { email: "user@example.com" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
  });

  it("sends email when user exists", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hash",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await requestPasswordResetService(
      { email: "user@example.com" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
  });

  it("resets password with valid token", async () => {
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "row-1",
              userId: "user-1",
              tokenHash,
              expiresAt: new Date(Date.now() + 60_000),
            },
          ]),
        }),
      }),
    });

    const result = await resetPasswordService(
      {
        token,
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
  });

  it("rejects invalid reset token", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await resetPasswordService(
      {
        token: "short",
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("returns field errors for weak password", async () => {
    const result = await resetPasswordService(
      {
        token: "valid-looking-token-value",
        password: "weak",
        confirmPassword: "weak",
      },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns rate limit error for reset", async () => {
    const { resetRateLimitsForTests } = await import("@/lib/security/rate-limit");
    resetRateLimitsForTests();

    for (let index = 0; index < 5; index += 1) {
      await requestPasswordResetService(
        { email: `user${index}@example.com` },
        "127.0.0.1-reset",
      );
    }

    const result = await requestPasswordResetService(
      { email: "another@example.com" },
      "127.0.0.1-reset",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many attempts");
  });

  it("rejects expired reset token", async () => {
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "row-1",
              userId: "user-1",
              tokenHash,
              expiresAt: new Date(Date.now() - 60_000),
            },
          ]),
        }),
      }),
    });

    const result = await resetPasswordService(
      {
        token,
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("returns rate limit error for reset password", async () => {
    const { resetRateLimitsForTests } = await import("@/lib/security/rate-limit");
    resetRateLimitsForTests();

    for (let index = 0; index < 5; index += 1) {
      await resetPasswordService(
        {
          token: "short",
          password: "SecurePass123!",
          confirmPassword: "SecurePass123!",
        },
        "127.0.0.1-reset-submit",
      );
    }

    const result = await resetPasswordService(
      {
        token: "short",
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      },
      "127.0.0.1-reset-submit",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many attempts");
  });
});
