import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: {
    APP_URL: "http://localhost:3000",
    EMAIL_PROVIDER: "console",
    ENCRYPTION_KEY: "test-encryption-key-at-least-32-characters-long",
  },
}));

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/auth/get-auth-session", () => ({
  getAuthSession: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  getEmailProvider: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/auth/totp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/totp")>();
  return {
    ...actual,
    generateTotpSecret: vi.fn().mockReturnValue("SECRET"),
    encryptTotpSecret: vi.fn().mockReturnValue("encrypted"),
    decryptTotpSecret: vi.fn().mockReturnValue("SECRET"),
    verifyTotpCode: vi.fn(),
    generateRecoveryCodes: vi.fn().mockReturnValue(["code-1", "code-2"]),
    hashRecoveryCode: vi.fn().mockResolvedValue("hash"),
    verifyRecoveryCode: vi.fn(),
  };
});

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,abc") },
}));

vi.mock("@/features/auth/services/user-repository", () => ({
  markRecoveryCodeUsed: vi.fn(),
}));

vi.mock("@/lib/auth/cookies", () => ({
  setSessionCookie: vi.fn(),
}));

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    reissueUserSession: vi.fn().mockResolvedValue({
      id: "session-new",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    }),
  };
});

import { setSessionCookie } from "@/lib/auth/cookies";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import { reissueUserSession } from "@/lib/auth/session";
import { verifyTotpCode } from "@/lib/auth/totp";
import {
  beginTotpSetupService,
  confirmTotpSetupService,
  disableTotpService,
  getTotpStatusService,
  regenerateRecoveryCodesService,
} from "@/features/auth/services/totp";
import { hashPassword } from "@/lib/auth/password";

const authSession = {
  user: { id: "user-1", email: "user@example.com", emailVerified: true },
  session: { id: "session-1", userId: "user-1", expiresAt: new Date() },
};

function selectLimit(result: unknown[]) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
}

function mockBeginSetupSelects(
  userResult: unknown[],
  totpResult: unknown[],
) {
  let callCount = 0;
  mockDb.select.mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(async () => {
          callCount += 1;
          return callCount === 1 ? userResult : totpResult;
        }),
      }),
    }),
  }));
}

describe("totp services", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockDb.select.mockReset();
    vi.mocked(getAuthSession).mockResolvedValue(authSession);
    const { markRecoveryCodeUsed } = await import(
      "@/features/auth/services/user-repository"
    );
    vi.mocked(markRecoveryCodeUsed).mockResolvedValue(true);
    const { resetRateLimitsForTests } = await import("@/lib/security/rate-limit");
    resetRateLimitsForTests();
    mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.transaction.mockImplementation(async (callback) =>
      callback({
        update: mockDb.update,
        delete: mockDb.delete,
        insert: mockDb.insert,
      }),
    );
  });

  it("returns disabled when unauthenticated", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    await expect(getTotpStatusService()).resolves.toEqual({ enabled: false });
  });

  it("returns enabled status for authenticated user", async () => {
    selectLimit([{ enabled: true }]);
    await expect(getTotpStatusService()).resolves.toEqual({ enabled: true });
  });

  it("rejects begin setup when unauthenticated", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    const result = await beginTotpSetupService(
      { password: "SecurePass123!" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("rejects begin setup when already enabled", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockBeginSetupSelects(
      [{ id: "user-1", passwordHash }],
      [{ id: "totp-1", enabled: true }],
    );
    const result = await beginTotpSetupService(
      { password: "SecurePass123!" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("rejects begin setup with wrong password", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockBeginSetupSelects([{ id: "user-1", passwordHash }], []);
    const result = await beginTotpSetupService(
      { password: "WrongPass123!" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("starts setup for new user", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockBeginSetupSelects([{ id: "user-1", passwordHash }], []);
    const result = await beginTotpSetupService(
      { password: "SecurePass123!" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
    expect(result.qrDataUrl).toContain("data:image");
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("updates existing disabled setup", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockBeginSetupSelects(
      [{ id: "user-1", passwordHash }],
      [{ id: "totp-1", enabled: false }],
    );
    const result = await beginTotpSetupService(
      { password: "SecurePass123!" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("confirms setup with valid code", async () => {
    selectLimit([{ id: "totp-1", secretEncrypted: "enc", enabled: false }]);
    vi.mocked(verifyTotpCode).mockResolvedValue(true);
    const result = await confirmTotpSetupService({ code: "123456" }, "127.0.0.1");
    expect(result.success).toBe(true);
    expect(result.recoveryCodes).toEqual(["code-1", "code-2"]);
  });

  it("rejects confirm without prior setup", async () => {
    selectLimit([]);
    const result = await confirmTotpSetupService({ code: "123456" }, "127.0.0.1");
    expect(result.success).toBe(false);
  });

  it("disables totp with password and code", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    selectLimit([{ passwordHash }]);
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ passwordHash }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "totp-1", enabled: true, secretEncrypted: "enc" },
            ]),
          }),
        }),
      });
    vi.mocked(verifyTotpCode).mockResolvedValue(true);

    const result = await disableTotpService(
      { password: "SecurePass123!", code: "123456" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
  });

  it("regenerates recovery codes", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ passwordHash }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "totp-1", enabled: true, secretEncrypted: "enc" },
            ]),
          }),
        }),
      });
    vi.mocked(verifyTotpCode).mockResolvedValue(true);
    const result = await regenerateRecoveryCodesService(
      { password: "SecurePass123!", code: "123456" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
    expect(result.recoveryCodes).toHaveLength(2);
  });

  it("reissues session after confirming totp setup", async () => {
    selectLimit([{ id: "totp-1", secretEncrypted: "enc", enabled: false }]);
    vi.mocked(verifyTotpCode).mockResolvedValue(true);

    const result = await confirmTotpSetupService({ code: "123456" }, "127.0.0.1");
    expect(result.success).toBe(true);
    expect(reissueUserSession).toHaveBeenCalledWith("user-1");
    expect(setSessionCookie).toHaveBeenCalledWith("session-new");
  });

  it("rejects invalid confirm code", async () => {
    selectLimit([{ id: "totp-1", secretEncrypted: "enc", enabled: false }]);
    vi.mocked(verifyTotpCode).mockResolvedValue(false);
    const result = await confirmTotpSetupService({ code: "123456" }, "127.0.0.1");
    expect(result.success).toBe(false);
  });

  it("rejects disable when totp is not enabled", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    selectLimit([{ passwordHash }]);
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ passwordHash }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

    const result = await disableTotpService(
      { password: "SecurePass123!", code: "123456" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("rejects confirm when unauthenticated", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    const result = await confirmTotpSetupService({ code: "123456" }, "127.0.0.1");
    expect(result.success).toBe(false);
  });

  it("rejects disable with wrong password", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ passwordHash }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "totp-1", enabled: true, secretEncrypted: "enc" },
            ]),
          }),
        }),
      });

    const result = await disableTotpService(
      { password: "WrongPass123!", code: "123456" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("rejects regenerate when totp disabled", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ passwordHash }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
    const result = await regenerateRecoveryCodesService(
      { password: "SecurePass123!", code: "123456" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("disables totp with recovery code", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ passwordHash }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "totp-1", enabled: true, secretEncrypted: "enc" },
            ]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "code-1", codeHash: "hash", used: false },
          ]),
        }),
      });

    const { verifyRecoveryCode } = await import("@/lib/auth/totp");
    const { markRecoveryCodeUsed } = await import(
      "@/features/auth/services/user-repository"
    );
    vi.mocked(verifyRecoveryCode).mockResolvedValue(true);
    vi.mocked(markRecoveryCodeUsed).mockResolvedValue(true);

    const result = await disableTotpService(
      { password: "SecurePass123!", code: "a1b2c3d4-e5f67890" },
      "127.0.0.1",
    );
    expect(result.success).toBe(true);
  });

  it("rejects regenerate with invalid code", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ passwordHash }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "totp-1", enabled: true, secretEncrypted: "enc" },
            ]),
          }),
        }),
      });
    vi.mocked(verifyTotpCode).mockResolvedValue(false);
    const result = await regenerateRecoveryCodesService(
      { password: "SecurePass123!", code: "123456" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("rejects disable with invalid totp code", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ passwordHash }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "totp-1", enabled: true, secretEncrypted: "enc" },
            ]),
          }),
        }),
      });
    vi.mocked(verifyTotpCode).mockResolvedValue(false);

    const result = await disableTotpService(
      { password: "SecurePass123!", code: "123456" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("returns rate limit error during confirm setup", async () => {
    selectLimit([{ id: "totp-1", secretEncrypted: "enc", enabled: false }]);
    for (let index = 0; index < 5; index += 1) {
      await confirmTotpSetupService({ code: "123456" }, "127.0.0.1-totp-setup");
    }
    const result = await confirmTotpSetupService(
      { code: "123456" },
      "127.0.0.1-totp-setup",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many attempts");
  });

  it("returns rate limit error during disable", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    selectLimit([{ passwordHash }]);
    for (let index = 0; index < 5; index += 1) {
      await disableTotpService(
        { password: "SecurePass123!", code: "123456" },
        "127.0.0.1-totp-disable",
      );
    }
    const result = await disableTotpService(
      { password: "SecurePass123!", code: "123456" },
      "127.0.0.1-totp-disable",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many attempts");
  });

  it("returns field errors for invalid confirm code", async () => {
    const result = await confirmTotpSetupService({ code: "abc" }, "127.0.0.1");
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns field errors for invalid disable input", async () => {
    const result = await disableTotpService({ password: "", code: "" }, "127.0.0.1");
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns field errors for invalid recovery regen input", async () => {
    const result = await regenerateRecoveryCodesService(
      { password: "SecurePass123!", code: "abc" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("skips used recovery codes when disabling totp", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ passwordHash }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "totp-1", enabled: true, secretEncrypted: "enc" },
            ]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: "code-1", codeHash: "hash", used: true },
            { id: "code-2", codeHash: "hash2", used: false },
          ]),
        }),
      });

    const { verifyRecoveryCode } = await import("@/lib/auth/totp");
    vi.mocked(verifyRecoveryCode).mockResolvedValue(false);

    const result = await disableTotpService(
      { password: "SecurePass123!", code: "a1b2c3d4-e5f67890" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
    expect(verifyRecoveryCode).toHaveBeenCalledTimes(1);
  });

  it("returns unauthorized when user missing during disable", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await disableTotpService(
      { password: "SecurePass123!", code: "123456" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("returns unauthorized for recovery regeneration when unauthenticated", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    const result = await regenerateRecoveryCodesService(
      { password: "SecurePass123!", code: "123456" },
      "127.0.0.1",
    );
    expect(result.success).toBe(false);
  });

  it("returns rate limit error during recovery regeneration", async () => {
    const passwordHash = await hashPassword("SecurePass123!");
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ passwordHash }]),
        }),
      }),
    }));
    vi.mocked(verifyTotpCode).mockResolvedValue(true);
    for (let index = 0; index < 3; index += 1) {
      await regenerateRecoveryCodesService(
        { password: "SecurePass123!", code: "123456" },
        "127.0.0.1-recovery",
      );
    }
    const result = await regenerateRecoveryCodesService(
      { password: "SecurePass123!", code: "123456" },
      "127.0.0.1-recovery",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many attempts");
  });
});
