import { AccountSettings } from "@/features/auth/components/account-settings";
import { getCurrentUser } from "@/features/auth/server/session";
import { getTotpStatus } from "@/features/auth/server/totp";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  const totpStatus = await getTotpStatus();

  if (!user) {
    return null;
  }

  return (
    <div className="px-6 py-12">
      <AccountSettings user={user} totpEnabled={totpStatus.enabled} />
    </div>
  );
}
