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
  it("ignores proxy headers when trustProxy is false", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) =>
        name === "x-forwarded-for" ? "203.0.113.1, 10.0.0.1" : null,
    });

    await expect(getRequestClientIp({ trustProxy: false })).resolves.toBe(
      "local",
    );
    expect(headersMock).not.toHaveBeenCalled();
  });

  it("uses the first x-forwarded-for address when trustProxy is true", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) =>
        name === "x-forwarded-for" ? "203.0.113.1, 10.0.0.1" : null,
    });

    await expect(getRequestClientIp({ trustProxy: true })).resolves.toBe(
      "203.0.113.1",
    );
  });

  it("falls back when x-forwarded-for has no usable first address", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "x-forwarded-for") {
          return ", 10.0.0.1";
        }
        if (name === "x-real-ip") {
          return "198.51.100.42";
        }
        return null;
      },
    });

    await expect(getRequestClientIp({ trustProxy: true })).resolves.toBe(
      "198.51.100.42",
    );
  });

  it("falls back to x-real-ip and then unknown", async () => {
    headersMock.mockResolvedValue({
      get: (name: string) => (name === "x-real-ip" ? "198.51.100.42" : null),
    });

    await expect(getRequestClientIp({ trustProxy: true })).resolves.toBe(
      "198.51.100.42",
    );

    headersMock.mockResolvedValue({
      get: () => null,
    });

    await expect(getRequestClientIp({ trustProxy: true })).resolves.toBe(
      "unknown",
    );
  });
});
