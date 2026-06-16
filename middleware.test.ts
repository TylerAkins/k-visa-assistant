import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { signSessionCookieValue } from "@/lib/auth/session-cookie";

const SESSION_SECRET = "test-session-secret-at-least-32-characters";
const SESSION_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("redirects unauthenticated users away from account routes", async () => {
    vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/account/settings");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("allows guest routes even when a signed session cookie is present", async () => {
    vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
    const signed = await signSessionCookieValue(SESSION_ID, SESSION_SECRET);
    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/login");
    request.cookies.set("session", signed);
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("clears invalid session cookies on guest routes", async () => {
    vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/login");
    request.cookies.set("session", "invalid-session-value");
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.cookies.get("session")?.value).toBe("");
  });

  it("sets referrer policy on token pages", async () => {
    vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
    const { middleware } = await import("@/middleware");

    const request = new NextRequest(
      "http://localhost:3000/verify-email?token=abc",
    );
    const response = await middleware(request);

    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
});
