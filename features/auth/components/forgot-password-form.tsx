"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FormMessage } from "@/features/auth/components/form-message";
import { requestPasswordReset } from "@/features/auth/server/password-reset";
import type { ActionResult } from "@/features/auth/types";
import { cn } from "@/lib/utils";

const initialState: ActionResult = { success: false };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );
  const [email, setEmail] = useState("");

  if (state.success) {
    return (
      <AuthCard
        title="Check your email"
        description={
          email
            ? `If ${email} is registered, we sent password reset instructions.`
            : "If that address is registered, we sent password reset instructions."
        }
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            Open the link in the email to choose a new password. The link
            expires after one hour.
          </p>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
          >
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      description="We will email a reset link if an account exists for that address."
    >
      {state.error ? <FormMessage message={state.error} /> : null}
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
