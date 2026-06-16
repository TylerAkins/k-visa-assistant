import { describe, expect, it } from "vitest";

import { isPostgresUniqueViolation } from "@/db/errors";

describe("isPostgresUniqueViolation", () => {
  it("detects direct postgres unique violations", () => {
    expect(isPostgresUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("detects wrapped postgres unique violations", () => {
    expect(
      isPostgresUniqueViolation({ cause: { code: "23505" } }),
    ).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isPostgresUniqueViolation({ code: "23503" })).toBe(false);
    expect(isPostgresUniqueViolation(null)).toBe(false);
  });
});
