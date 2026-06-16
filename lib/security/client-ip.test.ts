import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import { getRequestClientIp } from "@/lib/security/client-ip";

describe("getRequestClientIp", () => {
  it("returns local fallback when trustProxy is false", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) =>
        name === "x-forwarded-for" ? "203.0.113.1" : null,
    });

    await expect(
      getRequestClientIp({ trustProxy: false, localFallback: "local" }),
    ).resolves.toBe("local");
  });

  it("ignores spoofed forwarded headers when trustProxy is false", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "x-forwarded-for") {
          return "203.0.113.1";
        }
        if (name === "user-agent") {
          return "TestAgent/1.0";
        }
        return null;
      },
    });

    await expect(getRequestClientIp({ trustProxy: false })).resolves.toMatch(
      /^fp:[0-9a-f]{16}$/,
    );
  });

  it("trusts forwarded headers only when connecting peer is in trusted CIDRs", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "x-connecting-peer") {
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

  it("ignores forwarded headers when connecting peer is not trusted", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "x-connecting-peer") {
          return "203.0.113.10";
        }
        if (name === "x-forwarded-for") {
          return "198.51.100.42";
        }
        if (name === "user-agent") {
          return "TestAgent/1.0";
        }
        return null;
      },
    });

    await expect(
      getRequestClientIp({
        trustProxy: true,
        trustedProxyCidrs: "10.0.0.0/8",
      }),
    ).resolves.toMatch(/^fp:[0-9a-f]{16}$/);
  });

  it("falls back to a fingerprint when no trusted peer is present", async () => {
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
