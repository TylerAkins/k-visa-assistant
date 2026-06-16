"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { FormMessage } from "@/features/auth/components/form-message";
import { verifyEmail } from "@/features/auth/server/verify-email";
import type { ActionResult } from "@/features/auth/types";

const initialState: ActionResult = { success: false };

type VerifyEmailFormProps = {
  token: string;
};

export function VerifyEmailForm({ token }: VerifyEmailFormProps) {
  const [state, action, pending] = useActionState(verifyEmail, initialState);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!token || submittedRef.current) {
      return;
    }

    submittedRef.current = true;
    const formData = new FormData();
    formData.set("token", token);
    action(formData);
  }, [token, action]);

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
      {state.success ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Continue to sign in
          </Link>
        </p>
      ) : null}
    </AuthCard>
  );
}
