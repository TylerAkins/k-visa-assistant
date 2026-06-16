import { describe, expect, it } from "vitest";

import {
  looksLikeSignedSessionCookie,
  parseSessionCookieValue,
  signSessionCookieValue,
} from "@/lib/auth/session-cookie";

const SESSION_SECRET = "test-session-secret-at-least-32-characters";
const SESSION_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("session-cookie", () => {
  it("signs and verifies session cookie values", async () => {
    const signed = await signSessionCookieValue(SESSION_ID, SESSION_SECRET);
    expect(looksLikeSignedSessionCookie(signed)).toBe(true);
    await expect(
      parseSessionCookieValue(signed, SESSION_SECRET),
    ).resolves.toBe(SESSION_ID);
  });

  it("rejects tampered signatures", async () => {
    const signed = await signSessionCookieValue(SESSION_ID, SESSION_SECRET);
    const tampered = `${SESSION_ID}.invalid-signature`;
    await expect(
      parseSessionCookieValue(tampered, SESSION_SECRET),
    ).resolves.toBeNull();
    await expect(
      parseSessionCookieValue(signed, "wrong-secret-at-least-32-characters!!"),
    ).resolves.toBeNull();
  });

  it("rejects unsigned cookie values", async () => {
    await expect(
      parseSessionCookieValue(SESSION_ID, SESSION_SECRET),
    ).resolves.toBeNull();
    expect(looksLikeSignedSessionCookie(SESSION_ID)).toBe(false);
  });
});
