import "server-only";

import { getRequestClientIp } from "@/lib/security/client-ip";
import { env } from "@/lib/env";
import { isLocalEnv } from "@/lib/env-schema";

export async function getAuthClientIp(): Promise<string> {
  if (isLocalEnv(env.APP_ENV)) {
    return getRequestClientIp({ trustProxy: false, localFallback: "local" });
  }

  return getRequestClientIp({
    trustProxy: env.TRUST_PROXY_HEADERS,
    trustedProxyCidrs: env.TRUSTED_PROXY_CIDRS,
  });
}
