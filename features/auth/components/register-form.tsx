"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FormMessage } from "@/features/auth/components/form-message";
import { registerUser } from "@/features/auth/server/register";
import type { ActionResult } from "@/features/auth/types";

const initialState: ActionResult = { success: false };

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerUser, initialState);

  return (
    <AuthCard
      title="Create account"
      description="Start your K-1 visa workflow with a secure account."
    >
      <FormMessage
        message={state.success ? state.error : state.error}
        variant={state.success ? "success" : "error"}
      />
      {state.fieldErrors?.email ? (
        <FormMessage message={state.fieldErrors.email[0]} />
      ) : null}
      {state.fieldErrors?.password ? (
        <FormMessage message={state.fieldErrors.password[0]} />
      ) : null}
      {state.fieldErrors?.confirmPassword ? (
        <FormMessage message={state.fieldErrors.confirmPassword[0]} />
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
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
