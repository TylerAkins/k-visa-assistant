import { describe, expect, it } from "vitest";
import { ZodError, ZodIssueCode } from "zod";

import {
  formatZodErrors,
  rateLimitError,
  unauthorizedResult,
} from "@/features/auth/services/action-utils";

describe("action-utils", () => {
  it("formats zod field errors", () => {
    const error = new ZodError([
      {
        code: ZodIssueCode.custom,
        message: "Invalid",
        path: ["email"],
      },
      {
        code: ZodIssueCode.custom,
        message: "Skipped",
        path: [0],
      },
    ]);

    expect(formatZodErrors(error)).toEqual({ email: ["Invalid"] });
  });

  it("returns rate limit error", () => {
    expect(rateLimitError(30).success).toBe(false);
    expect(rateLimitError(30).error).toContain("30");
  });

  it("returns unauthorized result", () => {
    expect(unauthorizedResult().error).toContain("signed in");
  });
});
