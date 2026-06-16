import { describe, expect, it, vi } from "vitest";

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import { getRequestClientIp } from "@/lib/security/client-ip";

describe("getRequestClientIp", () => {
  it("returns local fallback when trustProxy is false", async () => {
    headersMock.mockResolvedValue({
      get: () => null,
    });

    await expect(
      getRequestClientIp({ trustProxy: false, localFallback: "local" }),
    ).resolves.toBe("local");
  });

  it("uses connecting IP when trustProxy is false and no local fallback", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) =>
        name === "x-connecting-ip" ? "203.0.113.10" : null,
    });

    await expect(getRequestClientIp({ trustProxy: false })).resolves.toBe(
      "203.0.113.10",
    );
  });

  it("trusts forwarded headers only from trusted proxy CIDRs", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "x-connecting-ip") {
          return "10.0.0.1";
        }
        if (name === "x-forwarded-for") {
          return "203.0.113.1, 10.0.0.1";
        }
        return null;
      },
    });

    await expect(
      getRequestClientIp({
        trustProxy: true,
        trustedProxyCidrs: "10.0.0.0/8",
      }),
    ).resolves.toBe("203.0.113.1");
  });

  it("ignores forwarded headers when proxy is not trusted", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "x-connecting-ip") {
          return "203.0.113.10";
        }
        if (name === "x-forwarded-for") {
          return "198.51.100.42";
        }
        return null;
      },
    });

    await expect(
      getRequestClientIp({
        trustProxy: true,
        trustedProxyCidrs: "10.0.0.0/8",
      }),
    ).resolves.toBe("203.0.113.10");
  });

  it("falls back to a fingerprint when no IP is available", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "user-agent") {
          return "TestAgent/1.0";
        }
        return null;
      },
    });

    await expect(getRequestClientIp({ trustProxy: true })).resolves.toMatch(
      /^fp:[0-9a-f]{16}$/,
    );
  });
});
