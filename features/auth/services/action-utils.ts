import type { ZodError } from "zod";

import type { ActionResult } from "@/features/auth/types";

export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") {
      continue;
    }

    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }

    fieldErrors[field].push(issue.message);
  }

  return fieldErrors;
}

export function rateLimitError(retryAfterSeconds: number): ActionResult {
  return {
    success: false,
    error: `Too many attempts. Try again in ${retryAfterSeconds} seconds.`,
  };
}

export function unauthorizedResult(): ActionResult {
  return { success: false, error: "You must be signed in." };
}
