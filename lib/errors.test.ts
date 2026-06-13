import { describe, expect, it } from "vitest";

import { getSafeErrorMessage } from "@/lib/errors";

describe("getSafeErrorMessage", () => {
  it("returns the message from Error instances", () => {
    expect(getSafeErrorMessage(new Error("connection refused"))).toBe(
      "connection refused",
    );
  });

  it("returns a generic message for non-Error values", () => {
    expect(getSafeErrorMessage("failure")).toBe("unknown error");
    expect(getSafeErrorMessage(null)).toBe("unknown error");
  });
});
