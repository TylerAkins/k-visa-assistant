import { describe, expect, it } from "vitest";

import { buildHealthResponse } from "@/lib/health/response";

describe("buildHealthResponse", () => {
  describe("local (exposeDatabase)", () => {
    it("returns ok when the database is connected", () => {
      expect(buildHealthResponse(true, true)).toEqual({
        status: 200,
        body: { status: "ok", database: "connected" },
      });
    });

    it("returns degraded when the database is disconnected", () => {
      expect(buildHealthResponse(false, true)).toEqual({
        status: 503,
        body: { status: "degraded", database: "disconnected" },
      });
    });
  });

  describe("deployed (hide database details)", () => {
    it("returns ok without database field when connected", () => {
      expect(buildHealthResponse(true, false)).toEqual({
        status: 200,
        body: { status: "ok" },
      });
    });

    it("returns degraded without database field when disconnected", () => {
      expect(buildHealthResponse(false, false)).toEqual({
        status: 503,
        body: { status: "degraded" },
      });
    });
  });
});
