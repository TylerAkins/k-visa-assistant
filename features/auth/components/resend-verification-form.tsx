"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FormMessage } from "@/features/auth/components/form-message";
import { resendVerificationByEmail } from "@/features/auth/server/verify-email";
import type { ActionResult } from "@/features/auth/types";

const initialState: ActionResult = { success: false };

export function ResendVerificationForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    resendVerificationByEmail,
    initialState,
  );

  if (!open) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Need to verify your email?{" "}
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => setOpen(true)}
        >
          Resend verification link
        </button>
      </p>
    );
  }

  if (state.success) {
    return (
      <AuthCard
        title="Check your email"
        description="If that address has an unverified account, we sent a new verification link."
      >
        <FormMessage message={state.error} variant="success" />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Resend verification email"
      description="Enter the email you used to register."
    >
      <FormMessage message={state.error} />
      {state.fieldErrors?.email ? (
        <FormMessage message={state.fieldErrors.email[0]} />
      ) : null}
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="resend-email">Email</Label>
          <Input
            id="resend-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending..." : "Send verification link"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => setOpen(false)}
        >
          Back to sign in
        </button>
      </p>
    </AuthCard>
  );
}
