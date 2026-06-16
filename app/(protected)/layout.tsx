import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/features/auth/server/session";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.emailVerified) {
    redirect("/login");
  }

  return <>{children}</>;
}
