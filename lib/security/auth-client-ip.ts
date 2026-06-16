import "server-only";

import { getRequestClientIp } from "@/lib/security/client-ip";
import { env } from "@/lib/env";
import { isLocalEnv } from "@/lib/env-schema";

export async function getAuthClientIp(): Promise<string> {
  return getRequestClientIp({ trustProxy: !isLocalEnv(env.APP_ENV) });
}
