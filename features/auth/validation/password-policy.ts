import { z } from "zod";

export const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 12 characters",
    message: "Password must be at least 12 characters",
    test: (password: string) => password.length >= 12,
  },
  {
    id: "uppercase",
    label: "One uppercase letter (A-Z)",
    message: "Password must include an uppercase letter",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter (a-z)",
    message: "Password must include a lowercase letter",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number (0-9)",
    message: "Password must include a number",
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: "symbol",
    label: "One symbol (e.g. ! @ # $ %)",
    message: "Password must include a symbol",
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
] as const;

export const PASSWORD_REQUIREMENTS = PASSWORD_RULES.map((rule) => rule.label);

export function getPasswordRequirementStatuses(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password),
  }));
}

export const passwordSchema = z.string().superRefine((password, ctx) => {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: rule.message,
      });
    }
  }
});
