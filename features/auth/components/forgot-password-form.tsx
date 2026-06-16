"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FormMessage } from "@/features/auth/components/form-message";
import { requestPasswordReset } from "@/features/auth/server/password-reset";
import type { ActionResult } from "@/features/auth/types";

const initialState: ActionResult = { success: false };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <AuthCard
      title="Forgot password"
      description="We will email a reset link if an account exists for that address."
    >
      <FormMessage
        message={state.error}
        variant={state.success ? "success" : "error"}
      />
      {state.fieldErrors?.email ? (
        <FormMessage message={state.fieldErrors.email[0]} />
      ) : null}
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending..." : "Send reset link"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
