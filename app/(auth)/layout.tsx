import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/server/session";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (user?.emailVerified) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      {children}
    </div>
  );
}
