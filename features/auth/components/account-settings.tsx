"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/components/auth-card";
import { FormMessage } from "@/features/auth/components/form-message";
import { logoutUser } from "@/features/auth/server/logout";
import { resendVerificationEmail } from "@/features/auth/server/verify-email";
import {
  beginTotpSetup,
  confirmTotpSetup,
  disableTotp,
  regenerateRecoveryCodes,
} from "@/features/auth/server/totp";
import type { ActionResult, SessionUser, TotpSetupResult } from "@/features/auth/types";

const initialActionState: ActionResult = { success: false };
const initialTotpState: TotpSetupResult = { success: false };

type AccountSettingsProps = {
  user: SessionUser;
  totpEnabled: boolean;
};

export function AccountSettings({ user, totpEnabled }: AccountSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [beginTotpError, setBeginTotpError] = useState<string | null>(null);
  const [setupPassword, setSetupPassword] = useState("");
  const [resendState, resendAction, resendPending] = useActionState(
    async (_prev: ActionResult) => resendVerificationEmail(),
    initialActionState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmTotpSetup,
    initialTotpState,
  );
  const [disableState, disableAction, disablePending] = useActionState(
    disableTotp,
    initialActionState,
  );
  const [regenState, regenAction, regenPending] = useActionState(
    regenerateRecoveryCodes,
    initialTotpState,
  );

  const handleBeginTotp = () => {
    startTransition(async () => {
      setBeginTotpError(null);
      const result = await beginTotpSetup(setupPassword);
      if (result.qrDataUrl) {
        setQrDataUrl(result.qrDataUrl);
      } else if (result.error) {
        setBeginTotpError(result.error);
      } else if (result.fieldErrors?.password?.[0]) {
        setBeginTotpError(result.fieldErrors.password[0]);
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutUser();
      router.push("/login");
      router.refresh();
    });
  };

  const displayedRecoveryCodes =
    recoveryCodes ?? confirmState.recoveryCodes ?? regenState.recoveryCodes;

  useEffect(() => {
    if (confirmState.recoveryCodes) {
      setRecoveryCodes(confirmState.recoveryCodes);
    }
  }, [confirmState.recoveryCodes]);

  useEffect(() => {
    if (regenState.recoveryCodes) {
      setRecoveryCodes(regenState.recoveryCodes);
    }
  }, [regenState.recoveryCodes]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <AuthCard title="Account" description="Manage your account and security.">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-foreground">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email verified</dt>
            <dd className="font-medium text-foreground">
              {user.emailVerified ? "Yes" : "No"}
            </dd>
          </div>
        </dl>

        {!user.emailVerified ? (
          <div className="mt-4 space-y-2">
            <FormMessage
              message={resendState.error}
              variant={resendState.success ? "success" : "error"}
            />
            <form action={resendAction}>
              <Button type="submit" variant="outline" disabled={resendPending}>
                {resendPending ? "Sending..." : "Resend verification email"}
              </Button>
            </form>
          </div>
        ) : null}

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">
            Two-factor authentication
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {totpEnabled
              ? "Authenticator app is enabled for this account."
              : "Add an extra layer of security with an authenticator app."}
          </p>

          {!totpEnabled ? (
            <div className="mt-4 space-y-4">
              <FormMessage message={beginTotpError ?? undefined} />
              {!qrDataUrl ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="setup-password">Current password</Label>
                    <Input
                      id="setup-password"
                      type="password"
                      autoComplete="current-password"
                      value={setupPassword}
                      onChange={(event) => setSetupPassword(event.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBeginTotp}
                    disabled={isPending || setupPassword.length === 0}
                  >
                    {isPending ? "Preparing..." : "Set up authenticator"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <img
                    src={qrDataUrl}
                    alt="TOTP QR code"
                    className="mx-auto size-48 rounded-lg border border-border bg-white p-2"
                  />
                  <FormMessage message={confirmState.error} />
                  {confirmState.fieldErrors?.code ? (
                    <FormMessage message={confirmState.fieldErrors.code[0]} />
                  ) : null}
                  <form action={confirmAction} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="totp-code">Verification code</Label>
                      <Input
                        id="totp-code"
                        name="code"
                        inputMode="numeric"
                        placeholder="123456"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={confirmPending}>
                      {confirmPending ? "Enabling..." : "Enable two-factor"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <FormMessage message={disableState.error} variant={disableState.success ? "success" : "error"} />
              {disableState.fieldErrors?.password ? (
                <FormMessage message={disableState.fieldErrors.password[0]} />
              ) : null}
              {disableState.fieldErrors?.code ? (
                <FormMessage message={disableState.fieldErrors.code[0]} />
              ) : null}
              <form action={disableAction} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="disable-password">Password</Label>
                  <Input
                    id="disable-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disable-code">Authenticator or recovery code</Label>
                  <Input id="disable-code" name="code" required />
                </div>
                <Button type="submit" variant="destructive" disabled={disablePending}>
                  {disablePending ? "Disabling..." : "Disable two-factor"}
                </Button>
              </form>

              <FormMessage message={regenState.error} />
              {regenState.fieldErrors?.code ? (
                <FormMessage message={regenState.fieldErrors.code[0]} />
              ) : null}
              <form action={regenAction} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="regen-code">Authenticator code</Label>
                  <Input
                    id="regen-code"
                    name="code"
                    inputMode="numeric"
                    placeholder="123456"
                    required
                  />
                </div>
                <Button type="submit" variant="outline" disabled={regenPending}>
                  {regenPending ? "Generating..." : "Regenerate recovery codes"}
                </Button>
              </form>
            </div>
          )}

          {displayedRecoveryCodes ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">
                Save these recovery codes
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Each code can be used once. Store them somewhere safe.
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
                {displayedRecoveryCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            disabled={isPending}
          >
            {isPending ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </AuthCard>
    </div>
  );
}
