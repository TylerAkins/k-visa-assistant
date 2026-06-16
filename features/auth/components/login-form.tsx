"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FormMessage } from "@/features/auth/components/form-message";
import { loginUser, verifyLoginTotp } from "@/features/auth/server/login";
import type { LoginResult } from "@/features/auth/types";

const initialState: LoginResult = { success: false };

type LoginFormProps = {
  initialRequiresTotp?: boolean;
};

export function LoginForm({ initialRequiresTotp = false }: LoginFormProps) {
  const [loginState, loginAction, loginPending] = useActionState(
    loginUser,
    initialRequiresTotp
      ? { success: true, requiresTotp: true }
      : initialState,
  );
  const [totpState, totpAction, totpPending] = useActionState(
    verifyLoginTotp,
    initialState,
  );

  const requiresTotp = loginState.requiresTotp || totpState.requiresTotp;
  const state = requiresTotp ? totpState : loginState;
  const pending = requiresTotp ? totpPending : loginPending;

  if (requiresTotp) {
    return (
      <AuthCard
        title="Two-factor authentication"
        description="Enter the 6-digit code from your authenticator app or a recovery code."
      >
        <FormMessage message={state.error} />
        {state.fieldErrors?.code ? (
          <FormMessage message={state.fieldErrors.code[0]} />
        ) : null}
        {state.fieldErrors?.recoveryCode ? (
          <FormMessage message={state.fieldErrors.recoveryCode[0]} />
        ) : null}
        <form action={totpAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Authenticator code</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recoveryCode">Recovery code (optional)</Label>
            <Input
              id="recoveryCode"
              name="recoveryCode"
              autoComplete="off"
              placeholder="a1b2c3d4-e5f67890"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Verifying..." : "Continue"}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Sign in"
      description="Access your account to manage security settings."
    >
      <FormMessage message={state.error} />
      {state.fieldErrors?.email ? (
        <FormMessage message={state.fieldErrors.email[0]} />
      ) : null}
      {state.fieldErrors?.password ? (
        <FormMessage message={state.fieldErrors.password[0]} />
      ) : null}
      <form action={loginAction} className="space-y-4">
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
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}
