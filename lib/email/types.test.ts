import { describe, expect, it } from "vitest";

import type { EmailMessage, EmailProvider } from "@/lib/email/types";

describe("email types", () => {
  it("defines provider contract", () => {
    const provider: EmailProvider = {
      send: async (message: EmailMessage) => {
        expect(message).toBeDefined();
      },
    };

    expect(provider.send).toBeTypeOf("function");
  });
});
