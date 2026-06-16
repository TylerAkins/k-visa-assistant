import { describe, expect, it } from "vitest";

import {
  LOGIN_INVALID_MESSAGE,
  MAX_PENDING_LOGIN_ATTEMPTS,
  RECOVERY_CODE_COUNT,
  REGISTRATION_EMAIL_MESSAGE,
  SESSION_TTL_MS,
} from "@/lib/auth/constants";

describe("auth constants", () => {
  it("exports expected security messages", () => {
    expect(LOGIN_INVALID_MESSAGE).toBe("Invalid email or password.");
    expect(REGISTRATION_EMAIL_MESSAGE).toContain("verification");
  });

  it("exports expected TTL and limit values", () => {
    expect(SESSION_TTL_MS).toBeGreaterThan(0);
    expect(MAX_PENDING_LOGIN_ATTEMPTS).toBe(5);
    expect(RECOVERY_CODE_COUNT).toBe(10);
  });
});
