import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/features/auth/services/verify-email", () => ({
  verifyEmailService: vi.fn().mockResolvedValue({ success: false }),
  resendVerificationEmailService: vi.fn().mockResolvedValue({ success: false }),
}));

import {
  resendVerificationEmailService,
  verifyEmailService,
} from "@/features/auth/services/verify-email";
import {
  resendVerificationEmail,
  verifyEmail,
} from "@/features/auth/server/verify-email";

describe("verify-email actions", () => {
  it("delegates verifyEmail to service", async () => {
    const formData = new FormData();
    await verifyEmail({ success: false }, formData);
    expect(verifyEmailService).toHaveBeenCalled();
  });

  it("delegates resend to service", async () => {
    await resendVerificationEmail();
    expect(resendVerificationEmailService).toHaveBeenCalled();
  });
});
