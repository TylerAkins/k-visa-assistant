import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getRequestClientIpMock } = vi.hoisted(() => ({
  getRequestClientIpMock: vi.fn(),
}));

vi.mock("@/lib/security/client-ip", () => ({
  getRequestClientIp: getRequestClientIpMock,
}));

describe("getAuthClientIp", () => {
  it("does not trust proxy headers in local env", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: { APP_ENV: "local" },
    }));

    getRequestClientIpMock.mockResolvedValue("local");
    const { getAuthClientIp } = await import("@/lib/security/auth-client-ip");

    await expect(getAuthClientIp()).resolves.toBe("local");
    expect(getRequestClientIpMock).toHaveBeenCalledWith({ trustProxy: false });
  });

  it("trusts proxy headers in non-local env", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: { APP_ENV: "prod" },
    }));

    getRequestClientIpMock.mockResolvedValue("203.0.113.1");
    const { getAuthClientIp } = await import("@/lib/security/auth-client-ip");

    await expect(getAuthClientIp()).resolves.toBe("203.0.113.1");
    expect(getRequestClientIpMock).toHaveBeenCalledWith({ trustProxy: true });
  });
});
