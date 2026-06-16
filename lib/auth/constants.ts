export const SESSION_COOKIE_NAME_LOCAL = "session";
export const SESSION_COOKIE_NAME_HOST = "__Host-session";
export const PENDING_LOGIN_COOKIE_NAME_LOCAL = "pending-login";
export const PENDING_LOGIN_COOKIE_NAME_HOST = "__Host-pending-login";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const PENDING_LOGIN_TTL_MS = 5 * 60 * 1000;
export const MAX_PENDING_LOGIN_ATTEMPTS = 5;
export const TOTP_WINDOW_STEPS = 1;
export const RECOVERY_CODE_COUNT = 10;

export const LOGIN_INVALID_MESSAGE = "Invalid email or password.";
export const TOTP_INVALID_MESSAGE = "Invalid code.";
export const GENERIC_EMAIL_MESSAGE =
  "If an account exists, we sent an email.";
export const UNAUTHORIZED_MESSAGE = "You must be signed in.";
