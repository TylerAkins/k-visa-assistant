import { z } from "zod";

export const PASSWORD_REQUIREMENTS = [
  "At least 12 characters",
  "One uppercase letter (A-Z)",
  "One lowercase letter (a-z)",
  "One number (0–9)",
  "One symbol (e.g. ! @ # $ %)",
] as const;

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");
