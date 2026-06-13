import { describe, expect, it, vi } from "vitest";

import { checkDatabaseConnection } from "@/lib/db/health";

describe("checkDatabaseConnection", () => {
  it("returns true when the database query succeeds", async () => {
    const database = {
      execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    };

    await expect(checkDatabaseConnection(database)).resolves.toBe(true);
  });

  it("returns false when the database query fails", async () => {
    const database = {
      execute: vi.fn().mockRejectedValue(new Error("connection refused")),
    };

    await expect(checkDatabaseConnection(database)).resolves.toBe(false);
  });
});
