import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { getLoginState } from "@/features/auth/server/login";
import { getAuthSession } from "@/lib/auth/get-auth-session";

export default async function LoginPage() {
  const authSession = await getAuthSession();
  if (authSession) {
    redirect("/account/settings");
  }

  const loginState = await getLoginState();

  return (
    <LoginForm initialRequiresTotp={Boolean(loginState.requiresTotp)} />
  );
}
