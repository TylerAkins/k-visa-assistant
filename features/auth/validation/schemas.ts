import { z } from "zod";

import { passwordSchema } from "@/features/auth/validation/password-policy";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .transform((email) => email.toLowerCase());

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const totpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter a 6-digit code"),
});

export const recoveryCodeSchema = z.object({
  code: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{8}$/i,
      "Enter a valid recovery code (format: xxxxxxxx-xxxxxxxx)",
    ),
});

export const beginTotpSetupSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const disableTotpSchema = z.object({
  password: z.string().min(1, "Password is required"),
  code: z.string().min(1, "Code is required"),
});

export const regenerateRecoveryCodesSchema = z.object({
  password: z.string().min(1, "Password is required"),
  code: z.string().regex(/^\d{6}$/, "Enter a 6-digit code"),
});
