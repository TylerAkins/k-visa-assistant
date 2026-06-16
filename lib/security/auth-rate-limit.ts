import {
  checkRateLimit,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

export type AuthRateLimitAction =
  | "login"
  | "totp"
  | "signup"
  | "reset"
  | "verify"
  | "resend"
  | "totp-setup"
  | "totp-disable"
  | "recovery-regen";

const PRESETS: Record<
  AuthRateLimitAction,
  { limit: number; windowMs: number }
> = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  totp: { limit: 5, windowMs: 5 * 60 * 1000 },
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  reset: { limit: 5, windowMs: 60 * 60 * 1000 },
  verify: { limit: 10, windowMs: 15 * 60 * 1000 },
  resend: { limit: 3, windowMs: 60 * 60 * 1000 },
  "totp-setup": { limit: 5, windowMs: 15 * 60 * 1000 },
  "totp-disable": { limit: 5, windowMs: 15 * 60 * 1000 },
  "recovery-regen": { limit: 3, windowMs: 15 * 60 * 1000 },
};

export async function checkAuthRateLimit(
  action: AuthRateLimitAction,
  key: string,
  now?: number,
): Promise<RateLimitResult> {
  const preset = PRESETS[action];
  return checkRateLimit(
    `auth:${action}:${key}`,
    preset.limit,
    preset.windowMs,
    now,
  );
}

export async function checkAuthRateLimits(
  action: AuthRateLimitAction,
  keys: string[],
  now?: number,
): Promise<RateLimitResult> {
  for (const key of keys) {
    const result = await checkAuthRateLimit(action, key, now);
    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

export function getAuthRateLimitKeys(action: AuthRateLimitAction): string[] {
  switch (action) {
    case "login":
      return ["auth:login:ip", "auth:login:email"];
    case "totp":
      return ["auth:totp:pending", "auth:totp:ip", "auth:totp:user"];
    case "signup":
      return ["auth:signup:ip"];
    case "reset":
      return ["auth:reset:ip", "auth:reset:email"];
    case "verify":
      return ["auth:verify:ip"];
    case "resend":
      return ["auth:resend:ip", "auth:resend:email"];
    case "totp-setup":
      return ["auth:totp-setup:ip", "auth:totp-setup:user"];
    case "totp-disable":
      return ["auth:totp-disable:ip", "auth:totp-disable:user"];
    case "recovery-regen":
      return ["auth:recovery-regen:ip", "auth:recovery-regen:user"];
    default:
      return [];
  }
}
