import { z } from "zod";

import { isValidCidrList } from "@/lib/security/cidr";

export const appEnvironments = ["local", "dev", "prod"] as const;
export type AppEnvironment = (typeof appEnvironments)[number];

export const envSchema = z
  .object({
    APP_ENV: z.enum(appEnvironments),
    NODE_ENV: z.enum(["development", "test", "production"]),
    APP_URL: z.url(),
    DATABASE_URL: z.string().min(1),
    DEV_ALLOWED_CIDRS: z.string().optional(),
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
    DEV_ALLOWED_CIDRS: config.DEV_ALLOWED_CIDRS,
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
