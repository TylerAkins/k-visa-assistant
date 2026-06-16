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

vi.mock("@/lib/auth/get-auth-session", () => ({
  getAuthSession: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  getEmailProvider: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/features/auth/services/user-repository", () => ({
  createEmailVerificationToken: vi.fn().mockResolvedValue("verify-token"),
}));

import { getAuthSession } from "@/lib/auth/get-auth-session";
import {
  resendVerificationEmailService,
  verifyEmailService,
} from "@/features/auth/services/verify-email";
import { generateSecureToken, hashToken } from "@/lib/auth/tokens";

const authSession = {
  user: { id: "user-1", email: "user@example.com", emailVerified: false },
  session: { id: "session-1", userId: "user-1", expiresAt: new Date() },
};

describe("verify-email services", () => {
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

  it("rejects missing verification token input", async () => {
    const result = await verifyEmailService({}, "127.0.0.1");
    expect(result.success).toBe(false);
  });

  it("rejects invalid token", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await verifyEmailService({ token: "invalid-token" }, "127.0.0.1");
    expect(result.success).toBe(false);
  });

  it("verifies email with valid token", async () => {
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

    const result = await verifyEmailService({ token }, "127.0.0.1");
    expect(result.success).toBe(true);
  });

  it("requires auth for resend", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    const result = await resendVerificationEmailService("127.0.0.1");
    expect(result.success).toBe(false);
  });

  it("rejects resend when already verified", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({
      ...authSession,
      user: { ...authSession.user, emailVerified: true },
    });
    const result = await resendVerificationEmailService("127.0.0.1");
    expect(result.success).toBe(false);
  });

  it("resends verification email", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(authSession);
    const result = await resendVerificationEmailService("127.0.0.1");
    expect(result.success).toBe(true);
  });

  it("returns rate limit error for verify", async () => {
    const { resetRateLimitsForTests } = await import("@/lib/security/rate-limit");
    resetRateLimitsForTests();

    for (let index = 0; index < 10; index += 1) {
      await verifyEmailService({ token: "invalid-token" }, "127.0.0.1-verify");
    }

    const result = await verifyEmailService({ token: "invalid-token" }, "127.0.0.1-verify");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many attempts");
  });
});
