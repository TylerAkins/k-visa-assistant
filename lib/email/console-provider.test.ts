import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: { APP_ENV: "local", EMAIL_PROVIDER: "console" },
}));

import { ConsoleEmailProvider } from "@/lib/email/console-provider";

describe("ConsoleEmailProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs full body in local env", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const provider = new ConsoleEmailProvider();

    await provider.send({
      to: "user@example.com",
      subject: "Verify",
      text: "token=secret",
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("token=secret"),
    );
  });
});
