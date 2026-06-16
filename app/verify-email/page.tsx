import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";

  return <VerifyEmailForm token={token} />;
}
