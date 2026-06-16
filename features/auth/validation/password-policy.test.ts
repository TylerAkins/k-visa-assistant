import { describe, expect, it } from "vitest";

import {
  getPasswordRequirementStatuses,
  passwordSchema,
} from "@/features/auth/validation/password-policy";

describe("passwordSchema", () => {
  it("accepts strong passwords", () => {
    expect(
      passwordSchema.safeParse("SecurePass123!").success,
    ).toBe(true);
  });

  it("rejects weak passwords", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase1!").success).toBe(false);
  });
});

describe("getPasswordRequirementStatuses", () => {
  it("marks satisfied rules for a strong password", () => {
    const statuses = getPasswordRequirementStatuses("SecurePass123!");
    expect(statuses.every((rule) => rule.met)).toBe(true);
  });

  it("marks only matching rules for partial passwords", () => {
    const statuses = getPasswordRequirementStatuses("secure");
    expect(statuses.find((rule) => rule.id === "lowercase")?.met).toBe(true);
    expect(statuses.find((rule) => rule.id === "length")?.met).toBe(false);
  });
});
