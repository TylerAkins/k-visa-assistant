import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/services/totp", () => ({
  getTotpStatusService: vi.fn().mockResolvedValue({ enabled: false }),
  beginTotpSetupService: vi.fn(),
  confirmTotpSetupService: vi.fn(),
  disableTotpService: vi.fn(),
  regenerateRecoveryCodesService: vi.fn(),
}));

import { getTotpStatusService } from "@/features/auth/services/totp";
import { getTotpStatus } from "@/features/auth/server/totp";

describe("totp actions", () => {
  it("delegates getTotpStatus to service", async () => {
    await expect(getTotpStatus()).resolves.toEqual({ enabled: false });
    expect(getTotpStatusService).toHaveBeenCalled();
  });
});
