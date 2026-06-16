"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FormMessage } from "@/features/auth/components/form-message";
import { PasswordRequirements } from "@/features/auth/components/password-requirements";
import { resetPassword } from "@/features/auth/server/password-reset";
import type { ActionResult } from "@/features/auth/types";

const initialState: ActionResult = { success: false };

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, action, pending] = useActionState(resetPassword, initialState);
  const [password, setPassword] = useState("");

  return (
    <AuthCard
      title="Reset password"
      description="Choose a new password for your account."
    >
      <FormMessage
        message={state.error}
        variant={state.success ? "success" : "error"}
      />
      {state.fieldErrors?.password ? (
        <FormMessage message={state.fieldErrors.password[0]} />
      ) : null}
      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-describedby="reset-password-requirements"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <PasswordRequirements
            id="reset-password-requirements"
            password={password}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending || !token}>
          {pending ? "Updating..." : "Update password"}
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
