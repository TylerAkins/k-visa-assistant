import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkDatabaseConnectionMock, envMock, checkRateLimitMock, getRequestClientIpMock } =
  vi.hoisted(() => ({
    checkDatabaseConnectionMock: vi.fn(),
    envMock: { APP_ENV: "local" as "local" | "dev" | "prod" },
    checkRateLimitMock: vi.fn().mockReturnValue({ allowed: true }),
    getRequestClientIpMock: vi.fn().mockResolvedValue("203.0.113.1"),
  }));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/db/health", () => ({
  checkDatabaseConnection: checkDatabaseConnectionMock,
}));

vi.mock("@/lib/env", () => ({
  env: envMock,
}));

vi.mock("@/lib/security/client-ip", () => ({
  getRequestClientIp: getRequestClientIpMock,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.APP_ENV = "local";
    checkRateLimitMock.mockReturnValue({ allowed: true });
    getRequestClientIpMock.mockResolvedValue("203.0.113.1");
  });

  it("exposes database status only in local", async () => {
    checkDatabaseConnectionMock.mockResolvedValue(true);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok", database: "connected" });
  });

  it("hides database details in dev", async () => {
    envMock.APP_ENV = "dev";
    checkDatabaseConnectionMock.mockResolvedValue(true);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(body).not.toHaveProperty("database");
  });

  it("returns degraded with database details when disconnected in local", async () => {
    checkDatabaseConnectionMock.mockResolvedValue(false);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: "degraded", database: "disconnected" });
  });

  it("hides database details in deployed environments", async () => {
    envMock.APP_ENV = "prod";
    checkDatabaseConnectionMock.mockResolvedValue(true);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(body).not.toHaveProperty("database");
  });

  it("returns degraded without database details when disconnected in prod", async () => {
    envMock.APP_ENV = "prod";
    checkDatabaseConnectionMock.mockResolvedValue(false);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: "degraded" });
  });

  it("returns degraded when the health check throws", async () => {
    envMock.APP_ENV = "prod";
    checkDatabaseConnectionMock.mockRejectedValue(new Error("connection refused"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: "degraded" });
  });

  it("returns 429 when rate limited", async () => {
    checkRateLimitMock.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 30,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({ status: "degraded", reason: "rate_limited" });
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(checkDatabaseConnectionMock).not.toHaveBeenCalled();
  });
});
