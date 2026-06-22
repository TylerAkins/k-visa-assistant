"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FormMessage } from "@/features/auth/components/form-message";
import { verifyEmail } from "@/features/auth/server/verify-email";
import type { ActionResult } from "@/features/auth/types";

const initialState: ActionResult = { success: false };
const submittedTokens = new Set<string>();

type VerifyEmailFormProps = {
  token: string;
};

export function VerifyEmailForm({ token }: VerifyEmailFormProps) {
  const [state, action, pending] = useActionState(verifyEmail, initialState);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    if (!token || autoSubmittedRef.current || submittedTokens.has(token)) {
      return;
    }

    autoSubmittedRef.current = true;
    submittedTokens.add(token);
    const formData = new FormData();
    formData.set("token", token);
    startTransition(() => {
      action(formData);
    });
  }, [token, action]);

  const handleRetry = () => {
    if (!token) {
      return;
    }

    const formData = new FormData();
    formData.set("token", token);
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <AuthCard
      title="Verify email"
      description="Confirming your email address."
    >
      {!token ? (
        <FormMessage message="Missing verification token." />
      ) : null}
      {pending ? (
        <p className="text-sm text-muted-foreground">Verifying...</p>
      ) : null}
      <FormMessage
        message={state.error}
        variant={state.success ? "success" : "error"}
      />
      {state.fieldErrors?.token ? (
        <FormMessage message={state.fieldErrors.token[0]} />
      ) : null}
      {state.success ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Continue to sign in
          </Link>
        </p>
      ) : null}
      {!state.success && token && !pending ? (
        <Button type="button" variant="outline" className="w-full" onClick={handleRetry}>
          Try again
        </Button>
      ) : null}
    </AuthCard>
  );
}
