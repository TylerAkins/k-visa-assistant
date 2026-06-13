import "server-only";

import { isIP } from "node:net";

import { headers } from "next/headers";

type GetRequestClientIpOptions = {
  trustProxy: boolean;
};

const MAX_IP_LENGTH = 45;

function normalizeTrustedIp(value: string | null): string | null {
  const candidate = value?.trim();

  if (!candidate || candidate.length > MAX_IP_LENGTH || isIP(candidate) === 0) {
    return null;
  }

  return candidate;
}

export async function getRequestClientIp(
  options: GetRequestClientIpOptions,
): Promise<string> {
  if (!options.trustProxy) {
    return "local";
  }

  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = normalizeTrustedIp(forwardedFor.split(",")[0] ?? null);
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = normalizeTrustedIp(headerStore.get("x-real-ip"));
  if (realIp) {
    return realIp;
  }

  return "unknown";
}
