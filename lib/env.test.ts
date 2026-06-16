import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const baseEnv = {
  APP_ENV: "local",
  NODE_ENV: "development",
  APP_URL: "http://localhost:3000",
  DATABASE_URL:
    "postgresql://kvisaassistant:kvisaassistant@127.0.0.1:5432/kvisaassistant",
  SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
  ENCRYPTION_KEY: "test-encryption-key-at-least-32-characters-long",
  EMAIL_PROVIDER: "console",
} as const;

function stubBaseEnv() {
  process.env.APP_ENV = baseEnv.APP_ENV;
  process.env.NODE_ENV = baseEnv.NODE_ENV;
  process.env.APP_URL = baseEnv.APP_URL;
  process.env.DATABASE_URL = baseEnv.DATABASE_URL;
  process.env.SESSION_SECRET = baseEnv.SESSION_SECRET;
  process.env.ENCRYPTION_KEY = baseEnv.ENCRYPTION_KEY;
  process.env.EMAIL_PROVIDER = baseEnv.EMAIL_PROVIDER;
  delete process.env.DEV_ALLOWED_CIDRS;
  delete process.env.TRUST_PROXY_HEADERS;
  delete process.env.TRUSTED_PROXY_CIDRS;
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
    process.env.APP_ENV = "dev";
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://dev.example.com";
    process.env.DATABASE_URL =
      "postgresql://user:pass@db.example.com:5432/kvisaassistant";
    process.env.SESSION_SECRET = baseEnv.SESSION_SECRET;
    process.env.ENCRYPTION_KEY = baseEnv.ENCRYPTION_KEY;
    process.env.DEV_ALLOWED_CIDRS = "203.0.113.0/24";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("@/lib/env");

    expect(warnSpy).toHaveBeenCalledWith(
      "DEV_ALLOWED_CIDRS is set but IP allowlisting is not enforced until Phase 9 (Caddy).",
    );

    warnSpy.mockRestore();
  });

  it("warns when APP_ENV is local with production NODE_ENV", async () => {
    process.env.APP_ENV = "local";
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "http://localhost:3000";
    process.env.DATABASE_URL = baseEnv.DATABASE_URL;
    process.env.SESSION_SECRET = baseEnv.SESSION_SECRET;
    process.env.ENCRYPTION_KEY = baseEnv.ENCRYPTION_KEY;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("@/lib/env");

    expect(warnSpy).toHaveBeenCalledWith(
      "APP_ENV=local with NODE_ENV=production is likely a misconfiguration on a deployed server.",
    );

    warnSpy.mockRestore();
  });
});
