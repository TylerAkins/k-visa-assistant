import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const baseEnv = {
  APP_ENV: "local",
  NODE_ENV: "development",
  APP_URL: "http://localhost:3000",
  DATABASE_URL:
    "postgresql://kvisaassistant:kvisaassistant@127.0.0.1:5432/kvisaassistant",
} as const;

function stubBaseEnv() {
  vi.stubEnv("APP_ENV", baseEnv.APP_ENV);
  vi.stubEnv("NODE_ENV", baseEnv.NODE_ENV);
  vi.stubEnv("APP_URL", baseEnv.APP_URL);
  vi.stubEnv("DATABASE_URL", baseEnv.DATABASE_URL);
  vi.unstubAllEnvs();
  vi.stubEnv("APP_ENV", baseEnv.APP_ENV);
  vi.stubEnv("NODE_ENV", baseEnv.NODE_ENV);
  vi.stubEnv("APP_URL", baseEnv.APP_URL);
  vi.stubEnv("DATABASE_URL", baseEnv.DATABASE_URL);
  delete process.env.DEV_ALLOWED_CIDRS;
}

describe("lib/env", () => {
  beforeEach(() => {
    vi.resetModules();
    stubBaseEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("loads validated env flags from process.env", async () => {
    const { env, isLocal, isDev, isProd } = await import("@/lib/env");

    expect(env.APP_ENV).toBe("local");
    expect(isLocal).toBe(true);
    expect(isDev).toBe(false);
    expect(isProd).toBe(false);
  });

  it("warns when DEV_ALLOWED_CIDRS is set in dev before enforcement exists", async () => {
    vi.stubEnv("APP_ENV", "dev");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://dev.example.com");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://user:pass@db.example.com:5432/kvisaassistant",
    );
    vi.stubEnv("DEV_ALLOWED_CIDRS", "203.0.113.0/24");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("@/lib/env");

    expect(warnSpy).toHaveBeenCalledWith(
      "DEV_ALLOWED_CIDRS is set but IP allowlisting is not enforced until Phase 9 (Caddy).",
    );

    warnSpy.mockRestore();
  });

  it("warns when APP_ENV is local with production NODE_ENV", async () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://kvisaassistant:kvisaassistant@127.0.0.1:5432/kvisaassistant",
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("@/lib/env");

    expect(warnSpy).toHaveBeenCalledWith(
      "APP_ENV=local with NODE_ENV=production is likely a misconfiguration on a deployed server.",
    );

    warnSpy.mockRestore();
  });
});
