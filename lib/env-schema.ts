import { z } from "zod";

import { isValidCidrList } from "@/lib/security/cidr";

function isPostgresDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "postgresql:" || url.protocol === "postgres:";
  } catch {
    return false;
  }
}

export const appEnvironments = ["local", "dev", "prod"] as const;
export type AppEnvironment = (typeof appEnvironments)[number];

export const emailProviders = ["console"] as const;
export type EmailProviderName = (typeof emailProviders)[number];

const secretSchema = z
  .string()
  .min(32, "Secret must be at least 32 characters");

export const envSchema = z
  .object({
    APP_ENV: z.enum(appEnvironments),
    NODE_ENV: z.enum(["development", "test", "production"]),
    APP_URL: z.url(),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine(isPostgresDatabaseUrl, {
        message: "DATABASE_URL must be a postgresql:// or postgres:// URL",
      }),
    SESSION_SECRET: secretSchema,
    ENCRYPTION_KEY: secretSchema,
    EMAIL_PROVIDER: z.enum(emailProviders).default("console"),
    DEV_ALLOWED_CIDRS: z.string().optional(),
    TRUST_PROXY_HEADERS: z
      .enum(["true", "false"])
      .optional()
      .default("false")
      .transform((value) => value === "true"),
    TRUSTED_PROXY_CIDRS: z.string().optional(),
    REDIS_URL: z.string().min(1).optional(),
  })
  .superRefine((data, context) => {
    if (
      (data.APP_ENV === "dev" || data.APP_ENV === "prod") &&
      data.NODE_ENV !== "production"
    ) {
      context.addIssue({
        code: "custom",
        path: ["NODE_ENV"],
        message: "NODE_ENV must be production when APP_ENV is dev or prod",
      });
    }

    if (data.APP_ENV !== "dev" && data.DEV_ALLOWED_CIDRS) {
      context.addIssue({
        code: "custom",
        path: ["DEV_ALLOWED_CIDRS"],
        message: "DEV_ALLOWED_CIDRS is only used when APP_ENV is dev",
      });
    }

    if (data.APP_ENV === "dev" && data.DEV_ALLOWED_CIDRS) {
      if (!isValidCidrList(data.DEV_ALLOWED_CIDRS)) {
        context.addIssue({
          code: "custom",
          path: ["DEV_ALLOWED_CIDRS"],
          message: "DEV_ALLOWED_CIDRS must be a comma-separated list of IPv4 CIDRs",
        });
      }
    }

    if (data.TRUST_PROXY_HEADERS && !data.TRUSTED_PROXY_CIDRS) {
      context.addIssue({
        code: "custom",
        path: ["TRUSTED_PROXY_CIDRS"],
        message:
          "TRUSTED_PROXY_CIDRS is required when TRUST_PROXY_HEADERS is true",
      });
    }

    if (data.TRUSTED_PROXY_CIDRS && !isValidCidrList(data.TRUSTED_PROXY_CIDRS)) {
      context.addIssue({
        code: "custom",
        path: ["TRUSTED_PROXY_CIDRS"],
        message:
          "TRUSTED_PROXY_CIDRS must be a comma-separated list of IPv4 CIDRs",
      });
    }

    if (data.APP_ENV === "prod" && !data.REDIS_URL) {
      context.addIssue({
        code: "custom",
        path: ["REDIS_URL"],
        message: "REDIS_URL is required when APP_ENV is prod",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function formatEnvErrors(error: z.ZodError<Env>): string {
  const fieldNames = new Set<string>();

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string") {
      fieldNames.add(field);
    }
  }

  return [...fieldNames].sort().join(", ");
}

export function parseEnvConfig(
  config: Record<string, string | undefined>,
): Env {
  const result = envSchema.safeParse({
    APP_ENV: config.APP_ENV,
    NODE_ENV: config.NODE_ENV,
    APP_URL: config.APP_URL,
    DATABASE_URL: config.DATABASE_URL,
    SESSION_SECRET: config.SESSION_SECRET,
    ENCRYPTION_KEY: config.ENCRYPTION_KEY,
    EMAIL_PROVIDER: config.EMAIL_PROVIDER,
    DEV_ALLOWED_CIDRS: config.DEV_ALLOWED_CIDRS,
    TRUST_PROXY_HEADERS: config.TRUST_PROXY_HEADERS,
    TRUSTED_PROXY_CIDRS: config.TRUSTED_PROXY_CIDRS,
    REDIS_URL: config.REDIS_URL,
  });

  if (!result.success) {
    throw new Error(
      `Missing or invalid environment variables: ${formatEnvErrors(result.error)}`,
    );
  }

  return result.data;
}

export function isLocalEnv(appEnv: AppEnvironment): boolean {
  return appEnv === "local";
}

export function isDevEnv(appEnv: AppEnvironment): boolean {
  return appEnv === "dev";
}

export function isProdEnv(appEnv: AppEnvironment): boolean {
  return appEnv === "prod";
}
