import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getRequestClientIpMock } = vi.hoisted(() => ({
  getRequestClientIpMock: vi.fn(),
}));

vi.mock("@/lib/security/client-ip", () => ({
  getRequestClientIp: getRequestClientIpMock,
}));

describe("getAuthClientIp", () => {
  it("uses local fallback in local env", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: { APP_ENV: "local", TRUST_PROXY_HEADERS: false },
    }));

    getRequestClientIpMock.mockResolvedValue("local");
    const { getAuthClientIp } = await import("@/lib/security/auth-client-ip");

    await expect(getAuthClientIp()).resolves.toBe("local");
    expect(getRequestClientIpMock).toHaveBeenCalledWith({
      trustProxy: false,
      localFallback: "local",
    });
  });

  it("uses trusted proxy settings in non-local env", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: {
        APP_ENV: "prod",
        TRUST_PROXY_HEADERS: true,
        TRUSTED_PROXY_CIDRS: "10.0.0.0/8",
      },
    }));

    getRequestClientIpMock.mockResolvedValue("203.0.113.1");
    const { getAuthClientIp } = await import("@/lib/security/auth-client-ip");

    await expect(getAuthClientIp()).resolves.toBe("203.0.113.1");
    expect(getRequestClientIpMock).toHaveBeenCalledWith({
      trustProxy: true,
      trustedProxyCidrs: "10.0.0.0/8",
    });
  });
});
