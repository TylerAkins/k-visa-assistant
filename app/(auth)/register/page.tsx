import { RegisterForm } from "@/features/auth/components/register-form";
import { LocalEmailDevNotice } from "@/features/auth/components/local-email-dev-notice";
import { env } from "@/lib/env";
import { isLocalEnv } from "@/lib/env-schema";

export default function RegisterPage() {
  const showLocalEmailHint = isLocalEnv(env.APP_ENV);

  return (
    <div className="space-y-4">
      {showLocalEmailHint ? <LocalEmailDevNotice /> : null}
      <RegisterForm />
    </div>
  );
}
