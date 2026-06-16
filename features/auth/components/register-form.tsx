"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FormMessage } from "@/features/auth/components/form-message";
import { PasswordRequirements } from "@/features/auth/components/password-requirements";
import { registerUser } from "@/features/auth/server/register";
import type { ActionResult } from "@/features/auth/types";
import { cn } from "@/lib/utils";

const initialState: ActionResult = { success: false };

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerUser, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (state.success) {
    return (
      <AuthCard
        title="Check your email"
        description={
          email
            ? `We sent a verification link to ${email}.`
            : "We sent a verification link to finish creating your account."
        }
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            Open the link in that email to verify your account. Once verified,
            sign in to continue setting up your case.
          </p>
          <p>
            The message can take a minute to arrive. Check spam if you do not
            see it.
          </p>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
          >
            Go to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create account"
      description="Start your K-1 visa workflow with a secure account."
    >
      {state.error ? <FormMessage message={state.error} /> : null}
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            aria-describedby="register-password-requirements"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <PasswordRequirements
            id="register-password-requirements"
            password={password}
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
