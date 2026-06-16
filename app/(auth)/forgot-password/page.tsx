import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { LocalEmailDevNotice } from "@/features/auth/components/local-email-dev-notice";
import { env } from "@/lib/env";
import { isLocalEnv } from "@/lib/env-schema";

export default function ForgotPasswordPage() {
  const showLocalEmailHint = isLocalEnv(env.APP_ENV);

  return (
    <div className="space-y-4">
      {showLocalEmailHint ? <LocalEmailDevNotice /> : null}
      <ForgotPasswordForm />
    </div>
  );
}
