import { afterEach, describe, expect, it, vi } from "vitest";

describe("ConsoleEmailProvider prod logging", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("omits body in non-local env", async () => {
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/env", () => ({
      env: { APP_ENV: "prod", EMAIL_PROVIDER: "console" },
    }));

    const { ConsoleEmailProvider } = await import(
      "@/lib/email/console-provider"
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const provider = new ConsoleEmailProvider();

    await provider.send({
      to: "user@example.com",
      subject: "Verify",
      text: "token=secret",
    });

    expect(logSpy).toHaveBeenCalledWith(
      "[email] to=user@example.com subject=Verify",
    );
  });
});
