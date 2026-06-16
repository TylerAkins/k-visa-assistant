import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: "user-1", email: "new@example.com" },
        ]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

vi.mock("@/lib/email", () => ({
  getEmailProvider: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/env", () => ({
  env: { APP_URL: "http://localhost:3000", EMAIL_PROVIDER: "console" },
}));

vi.mock("@/features/auth/services/user-repository", () => ({
  findUserByEmail: vi.fn().mockResolvedValue(null),
  createEmailVerificationToken: vi.fn().mockResolvedValue("token"),
}));

import { findUserByEmail } from "@/features/auth/services/user-repository";
import { registerUserService } from "@/features/auth/services/register-user";

describe("registerUserService", () => {
  it("returns generic success for valid input", async () => {
    const result = await registerUserService(
      {
        email: "new@example.com",
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      },
      "127.0.0.1",
    );

    expect(result.success).toBe(true);
  });

  it("returns field errors for invalid input", async () => {
    const result = await registerUserService(
      {
        email: "bad-email",
        password: "short",
        confirmPassword: "short",
      },
      "127.0.0.1",
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("skips user creation when email already exists", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce({
      id: "user-1",
      email: "existing@example.com",
      passwordHash: "hash",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await registerUserService(
      {
        email: "existing@example.com",
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      },
      "127.0.0.1",
    );

    expect(result.success).toBe(true);
    expect(result.verificationEmailSent).toBe(false);
  });

  it("updates password when re-registering an unverified account", async () => {
    const { db } = await import("@/db");
    vi.mocked(findUserByEmail).mockResolvedValueOnce({
      id: "user-1",
      email: "pending@example.com",
      passwordHash: "old-hash",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await registerUserService(
      {
        email: "pending@example.com",
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      },
      "127.0.0.1",
    );

    expect(result.success).toBe(true);
    expect(result.verificationEmailSent).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });

  it("returns rate limit error when exceeded", async () => {
    const { resetRateLimitsForTests } = await import(
      "@/lib/security/rate-limit"
    );
    resetRateLimitsForTests();

    for (let index = 0; index < 5; index += 1) {
      await registerUserService(
        {
          email: `user${index}@example.com`,
          password: "SecurePass123!",
          confirmPassword: "SecurePass123!",
        },
        "127.0.0.1-blocked",
      );
    }

    const result = await registerUserService(
      {
        email: "another@example.com",
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      },
      "127.0.0.1-blocked",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many attempts");
  });

  it("returns error when user insert fails", async () => {
    const { db } = await import("@/db");
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    } as never);

    const result = await registerUserService(
      {
        email: "new@example.com",
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      },
      "127.0.0.1",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unable to create account.");
  });
});
