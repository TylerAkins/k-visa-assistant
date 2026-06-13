import "server-only";

import { headers } from "next/headers";

type GetRequestClientIpOptions = {
  trustProxy: boolean;
};

export async function getRequestClientIp(
  options: GetRequestClientIpOptions,
): Promise<string> {
  if (!options.trustProxy) {
    return "local";
  }

  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = headerStore.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}
