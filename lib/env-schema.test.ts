import { describe, expect, it } from "vitest";

import {
  envSchema,
  formatEnvErrors,
  isDevEnv,
  isLocalEnv,
  isProdEnv,
  parseEnvConfig,
} from "@/lib/env-schema";

const localConfig = {
  APP_ENV: "local",
  NODE_ENV: "development",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://kvisaassistant:kvisaassistant@127.0.0.1:5432/kvisaassistant",
  SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
  ENCRYPTION_KEY: "test-encryption-key-at-least-32-characters-long",
  EMAIL_PROVIDER: "console",
};

describe("envSchema", () => {
  it("accepts a valid local configuration", () => {
    expect(envSchema.safeParse(localConfig).success).toBe(true);
  });

  it("requires NODE_ENV production for dev and prod APP_ENV", () => {
    const result = envSchema.safeParse({
      ...localConfig,
      APP_ENV: "dev",
      NODE_ENV: "development",
    });

    expect(result.success).toBe(false);
  });

  it("rejects DEV_ALLOWED_CIDRS outside dev", () => {
    const result = envSchema.safeParse({
      ...localConfig,
      DEV_ALLOWED_CIDRS: "203.0.113.0/24",
    });

    expect(result.success).toBe(false);
  });

  it("accepts DEV_ALLOWED_CIDRS for dev", () => {
    const result = envSchema.safeParse({
      APP_ENV: "dev",
      NODE_ENV: "production",
      APP_URL: "https://dev.example.com",
      DATABASE_URL: "postgresql://user:pass@db.example.com:5432/kvisaassistant",
      SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
      ENCRYPTION_KEY: "test-encryption-key-at-least-32-characters-long",
      DEV_ALLOWED_CIDRS: "203.0.113.0/24",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid DEV_ALLOWED_CIDRS values on dev", () => {
    const result = envSchema.safeParse({
      APP_ENV: "dev",
      NODE_ENV: "production",
      APP_URL: "https://dev.example.com",
      DATABASE_URL: "postgresql://user:pass@db.example.com:5432/kvisaassistant",
      SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
      ENCRYPTION_KEY: "test-encryption-key-at-least-32-characters-long",
      DEV_ALLOWED_CIDRS: "not-a-cidr",
    });

    expect(result.success).toBe(false);
  });

  it("rejects DEV_ALLOWED_CIDRS that allow every IPv4 address", () => {
    const result = envSchema.safeParse({
      APP_ENV: "dev",
      NODE_ENV: "production",
      APP_URL: "https://dev.example.com",
      DATABASE_URL: "postgresql://user:pass@db.example.com:5432/kvisaassistant",
      SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
      ENCRYPTION_KEY: "test-encryption-key-at-least-32-characters-long",
      DEV_ALLOWED_CIDRS: "0.0.0.0/0",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid prod configuration", () => {
    const result = envSchema.safeParse({
      APP_ENV: "prod",
      NODE_ENV: "production",
      APP_URL: "https://app.example.com",
      DATABASE_URL: "postgresql://user:pass@db.example.com:5432/kvisaassistant",
      SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
      ENCRYPTION_KEY: "test-encryption-key-at-least-32-characters-long",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = envSchema.safeParse({
      APP_ENV: "local",
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-postgres DATABASE_URL values", () => {
    const result = envSchema.safeParse({
      ...localConfig,
      DATABASE_URL: "mysql://user:pass@127.0.0.1:3306/kvisaassistant",
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed DATABASE_URL values", () => {
    const result = envSchema.safeParse({
      ...localConfig,
      DATABASE_URL: "not-a-database-url",
    });

    expect(result.success).toBe(false);
  });

  it("rejects secrets shorter than 32 characters", () => {
    const result = envSchema.safeParse({
      ...localConfig,
      SESSION_SECRET: "too-short",
    });

    expect(result.success).toBe(false);
  });
});

describe("formatEnvErrors", () => {
  it("lists unique invalid field names in sorted order", () => {
    const result = envSchema.safeParse({
      APP_ENV: "local",
      NODE_ENV: "development",
    });

    if (result.success) {
      throw new Error("expected validation to fail");
    }

    expect(formatEnvErrors(result.error)).toBe(
      "APP_URL, DATABASE_URL, ENCRYPTION_KEY, SESSION_SECRET",
    );
  });
});

describe("parseEnvConfig", () => {
  it("returns parsed config when validation succeeds", () => {
    expect(parseEnvConfig(localConfig)).toEqual(localConfig);
  });

  it("throws with field names only when validation fails", () => {
    expect(() =>
      parseEnvConfig({
        APP_ENV: "prod",
        NODE_ENV: "development",
        APP_URL: "https://app.example.com",
        DATABASE_URL: "postgresql://user:pass@db.example.com:5432/kvisaassistant",
        SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
        ENCRYPTION_KEY: "test-encryption-key-at-least-32-characters-long",
      }),
    ).toThrow("Missing or invalid environment variables: NODE_ENV");
  });
});

describe("environment helpers", () => {
  it("identifies each deployment target", () => {
    expect(isLocalEnv("local")).toBe(true);
    expect(isLocalEnv("dev")).toBe(false);
    expect(isDevEnv("dev")).toBe(true);
    expect(isDevEnv("prod")).toBe(false);
    expect(isProdEnv("prod")).toBe(true);
    expect(isProdEnv("local")).toBe(false);
  });
});
