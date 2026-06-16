import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: { APP_ENV: "local", EMAIL_PROVIDER: "console" },
}));

import {
  getEmailProvider,
  resetEmailProviderForTests,
} from "@/lib/email/index";
import { ConsoleEmailProvider } from "@/lib/email/console-provider";

describe("getEmailProvider", () => {
  afterEach(() => {
    resetEmailProviderForTests();
  });

  it("reuses singleton instance", () => {
    const first = getEmailProvider();
    const second = getEmailProvider();
    expect(first).toBe(second);
    expect(first).toBeInstanceOf(ConsoleEmailProvider);
  });

  it("throws for unknown providers", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: { APP_ENV: "local", EMAIL_PROVIDER: "unknown" },
    }));

    const { getEmailProvider, resetEmailProviderForTests } = await import(
      "@/lib/email/index"
    );
    resetEmailProviderForTests();

    expect(() => getEmailProvider()).toThrow("Unknown email provider");
  });
});
