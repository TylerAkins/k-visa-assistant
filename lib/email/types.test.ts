import { describe, expect, it } from "vitest";

import type { EmailMessage, EmailProvider } from "@/lib/email/types";

describe("email types", () => {
  it("defines provider contract", () => {
    const provider: EmailProvider = {
      send: async (_message: EmailMessage) => undefined,
    };

    expect(provider.send).toBeTypeOf("function");
  });
});
