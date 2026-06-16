import "server-only";

import { getAuthSession } from "@/lib/auth/get-auth-session";
import type { SessionUser } from "@/features/auth/types";

export async function getCurrentUserService(): Promise<SessionUser | null> {
  const authSession = await getAuthSession();
  return authSession?.user ?? null;
}
