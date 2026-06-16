import { LoginForm } from "@/features/auth/components/login-form";
import { getLoginState } from "@/features/auth/server/login";

export default async function LoginPage() {
  const loginState = await getLoginState();

  return (
    <LoginForm initialRequiresTotp={Boolean(loginState.requiresTotp)} />
  );
}
