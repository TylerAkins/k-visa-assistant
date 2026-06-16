import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { ResendVerificationForm } from "@/features/auth/components/resend-verification-form";
import { getLoginState } from "@/features/auth/server/login";
import { getAuthSession } from "@/lib/auth/get-auth-session";

export default async function LoginPage() {
  const loginState = await getLoginState();

  if (!loginState.requiresTotp) {
    const authSession = await getAuthSession();
    if (authSession) {
      redirect("/account/settings");
    }
  }

  return (
    <div className="space-y-4">
      <LoginForm initialRequiresTotp={Boolean(loginState.requiresTotp)} />
      {!loginState.requiresTotp ? <ResendVerificationForm /> : null}
    </div>
  );
}
