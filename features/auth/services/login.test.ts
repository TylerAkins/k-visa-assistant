import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: {
    APP_URL: "http://localhost:3000",
    ENCRYPTION_KEY: "test-encryption-key-at-least-32-characters-long",
  },
}));

const { mockDb, mockPendingLogin } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
  },
  mockPendingLogin: {
    createPendingLogin: vi.fn(),
    deletePendingLogin: vi.fn(),
    getPendingLogin: vi.fn(),
    incrementPendingLoginAttempts: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@/features/auth/services/user-repository", () => ({
  findUserByEmail: vi.fn(),
  markRecoveryCodeUsed: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  rotateSession: vi.fn().mockResolvedValue({
    id: "session-1",
    userId: "user-1",
    expiresAt: new Date(),
  }),
}));

vi.mock("@/lib/auth/cookies", () => ({
  getSessionIdFromCookies: vi.fn().mockResolvedValue(null),
  setSessionCookie: vi.fn(),
  setPendingLoginCookie: vi.fn(),
  clearPendingLoginCookie: vi.fn(),
  getPendingLoginIdFromCookies: vi.fn(),
}));

vi.mock("@/lib/auth/pending-login", () => mockPendingLogin);

vi.mock("@/lib/auth/totp", () => ({
  decryptTotpSecret: vi.fn().mockReturnValue("secret"),
  verifyRecoveryCode: vi.fn(),
  verifyTotpCode: vi.fn(),
}));

import { findUserByEmail, markRecoveryCodeUsed } from "@/features/auth/services/user-repository";
import {
  getLoginStateService,
  loginUserService,
  verifyLoginTotpService,
} from "@/features/auth/services/login";
import {
  clearPendingLoginCookie,
  getPendingLoginIdFromCookies,
} from "@/lib/auth/cookies";
import {
  createPendingLogin,
  deletePendingLogin,
  getPendingLogin,
  incrementPendingLoginAttempts,
} from "@/lib/auth/pending-login";
import { verifyTotpCode } from "@/lib/auth/totp";
import { hashPassword } from "@/lib/auth/password";

function mockTotpSelect(result: unknown[]) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
}

describe("loginUserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTotpSelect([]);
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue(undefined);
  });

  it("returns field errors for invalid input", async () => {
    const result = await loginUserService({ email: "bad", password: "" }, "127.0.0.1");
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns invalid credentials for unknown user", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);

    const result = await loginUserService(
      { email: "missing@example.com", password: "SecurePass123!" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid email or password.");
  });

  it("rejects unverified email with valid password", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await loginUserService(
      { email: "user@example.com", password: "SecurePass123!" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Verify your email before signing in.");
  });

  it("returns redirect target when password is valid and totp disabled", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await loginUserService(
      { email: "user@example.com", password: "SecurePass123!" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe("/account/settings");
  });

  it("requires totp when enabled", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockTotpSelect([{ enabled: true }]);
    vi.mocked(createPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(),
    });

    const result = await loginUserService(
      { email: "user@example.com", password: "SecurePass123!" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
    expect(result.requiresTotp).toBe(true);
  });

  it("returns rate limit error", async () => {
    const { resetRateLimitsForTests } = await import("@/lib/security/rate-limit");
    resetRateLimitsForTests();

    for (let index = 0; index < 10; index += 1) {
      await loginUserService(
        { email: "user@example.com", password: "wrong-password" },
        "127.0.0.1-rate",
      );
    }

    const result = await loginUserService(
      { email: "user@example.com", password: "wrong-password" },
      "127.0.0.1-rate",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many attempts");
  });
});

describe("verifyLoginTotpService", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockTotpSelect([{ enabled: true, secretEncrypted: "enc" }]);
    const { resetRateLimitsForTests } = await import("@/lib/security/rate-limit");
    resetRateLimitsForTests();
  });

  it("rejects missing pending login", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue(undefined);
    const result = await verifyLoginTotpService({ code: "123456" }, "127.0.0.1");
    expect(result.success).toBe(false);
  });

  it("rejects invalid totp code", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    vi.mocked(verifyTotpCode).mockResolvedValue(false);
    vi.mocked(incrementPendingLoginAttempts).mockResolvedValue(1);

    const result = await verifyLoginTotpService({ code: "123456" }, "127.0.0.1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid code.");
  });

  it("completes login with valid totp code", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    vi.mocked(verifyTotpCode).mockResolvedValue(true);

    const result = await verifyLoginTotpService({ code: "123456" }, "127.0.0.1");
    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe("/account/settings");
    expect(deletePendingLogin).toHaveBeenCalledWith("pending-1");
  });

  it("accepts valid recovery code", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "code-1", codeHash: "hash", used: false },
        ]),
      }),
    });
    const { verifyRecoveryCode } = await import("@/lib/auth/totp");
    vi.mocked(verifyRecoveryCode).mockResolvedValue(true);
    vi.mocked(markRecoveryCodeUsed).mockResolvedValue(true);

    const result = await verifyLoginTotpService(
      { recoveryCode: "a1b2c3d4-e5f67890" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe("/account/settings");
  });

  it("rejects expired pending login", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue(null);

    const result = await verifyLoginTotpService({ code: "123456" }, "127.0.0.1");
    expect(result.success).toBe(false);
    expect(clearPendingLoginCookie).toHaveBeenCalled();
  });

  it("rejects invalid recovery code format", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    vi.mocked(incrementPendingLoginAttempts).mockResolvedValue(1);

    const result = await verifyLoginTotpService(
      { recoveryCode: "not-a-code" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("returns field errors for invalid totp format", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    vi.mocked(incrementPendingLoginAttempts).mockResolvedValue(1);

    const result = await verifyLoginTotpService({ code: "abc" }, "127.0.0.1");
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("skips used recovery codes when validating", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "code-1", codeHash: "hash", used: true },
          { id: "code-2", codeHash: "hash2", used: false },
        ]),
      }),
    });
    const { verifyRecoveryCode } = await import("@/lib/auth/totp");
    vi.mocked(verifyRecoveryCode).mockResolvedValue(true);
    vi.mocked(markRecoveryCodeUsed).mockResolvedValue(true);

    const result = await verifyLoginTotpService(
      { recoveryCode: "a1b2c3d4-e5f67890" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
    expect(verifyRecoveryCode).toHaveBeenCalledTimes(1);
  });

  it("clears pending login after max invalid recovery attempts", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockPendingLogin.incrementPendingLoginAttempts.mockResolvedValue(5);

    const result = await verifyLoginTotpService(
      { recoveryCode: "bad-code" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
    expect(mockPendingLogin.deletePendingLogin).toHaveBeenCalledWith("pending-1");
  });

  it("increments attempts without clearing pending below max failures", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    vi.mocked(verifyTotpCode).mockResolvedValue(false);
    mockPendingLogin.incrementPendingLoginAttempts.mockResolvedValue(1);

    const result = await verifyLoginTotpService({ code: "123456" }, "127.0.0.1");
    expect(result.success).toBe(false);
    expect(mockPendingLogin.deletePendingLogin).not.toHaveBeenCalled();
  });

  it("rejects recovery code when mark used fails", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "code-1", codeHash: "hash", used: false },
        ]),
      }),
    });
    const { verifyRecoveryCode } = await import("@/lib/auth/totp");
    vi.mocked(verifyRecoveryCode).mockResolvedValue(true);
    vi.mocked(markRecoveryCodeUsed).mockResolvedValue(false);
    mockPendingLogin.incrementPendingLoginAttempts.mockResolvedValue(1);

    const result = await verifyLoginTotpService(
      { recoveryCode: "a1b2c3d4-e5f67890" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("clears pending login after max totp attempts", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockPendingLogin.incrementPendingLoginAttempts.mockResolvedValue(5);

    const result = await verifyLoginTotpService({ code: "abc" }, "127.0.0.1");
    expect(result.success).toBe(false);
    expect(mockPendingLogin.deletePendingLogin).toHaveBeenCalledWith("pending-1");
  });
});

describe("getLoginStateService", () => {
  it("returns false without pending cookie", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue(undefined);
    await expect(getLoginStateService()).resolves.toEqual({ success: false });
  });

  it("clears cookie when pending login expired", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue(null);
    await expect(getLoginStateService()).resolves.toEqual({ success: false });
    expect(clearPendingLoginCookie).toHaveBeenCalled();
  });

  it("returns totp required when pending login exists", async () => {
    vi.mocked(getPendingLoginIdFromCookies).mockResolvedValue("pending-1");
    vi.mocked(getPendingLogin).mockResolvedValue({
      id: "pending-1",
      userId: "user-1",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(getLoginStateService()).resolves.toEqual({
      success: true,
      requiresTotp: true,
    });
  });
});
