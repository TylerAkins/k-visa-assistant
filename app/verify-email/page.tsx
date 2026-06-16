import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";
import { LocalEmailDevNotice } from "@/features/auth/components/local-email-dev-notice";
import { env } from "@/lib/env";
import { isLocalEnv } from "@/lib/env-schema";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  const showLocalEmailHint = isLocalEnv(env.APP_ENV);

  return (
    <div className="space-y-4">
      {showLocalEmailHint ? <LocalEmailDevNotice /> : null}
      <VerifyEmailForm token={token} />
    </div>
  );
}
