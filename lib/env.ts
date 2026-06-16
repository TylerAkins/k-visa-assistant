import "server-only";

import {
  isDevEnv,
  isLocalEnv,
  isProdEnv,
  parseEnvConfig,
  type AppEnvironment,
  type Env,
} from "@/lib/env-schema";

export const env: Env = parseEnvConfig({
  APP_ENV: process.env.APP_ENV,
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  DEV_ALLOWED_CIDRS: process.env.DEV_ALLOWED_CIDRS,
  TRUST_PROXY_HEADERS: process.env.TRUST_PROXY_HEADERS,
  TRUSTED_PROXY_CIDRS: process.env.TRUSTED_PROXY_CIDRS,
  REDIS_URL: process.env.REDIS_URL,
});

export const isLocal = isLocalEnv(env.APP_ENV);
export const isDev = isDevEnv(env.APP_ENV);
export const isProd = isProdEnv(env.APP_ENV);

if (
  isDev &&
  env.DEV_ALLOWED_CIDRS &&
  env.DEV_ALLOWED_CIDRS.trim().length > 0
) {
  console.warn(
    "DEV_ALLOWED_CIDRS is set but IP allowlisting is not enforced until Phase 9 (Caddy).",
  );
}

if (isLocal && env.NODE_ENV === "production") {
  console.warn(
    "APP_ENV=local with NODE_ENV=production is likely a misconfiguration on a deployed server.",
  );
}

if (isProd && env.TRUST_PROXY_HEADERS) {
  console.warn(
    "TRUST_PROXY_HEADERS is enabled: ensure the reverse proxy sets x-connecting-peer and the app binds to localhost.",
  );
}

export type { AppEnvironment, Env };
