import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";

import { headers } from "next/headers";

import { isIpv4InAnyCidr } from "@/lib/security/cidr";

type GetRequestClientIpOptions = {
  trustProxy: boolean;
  trustedProxyCidrs?: string;
  localFallback?: string;
};

const MAX_IP_LENGTH = 45;
const CONNECTING_IP_HEADER = "x-connecting-ip";

function normalizeTrustedIp(value: string | null): string | null {
  const candidate = value?.trim();

  if (!candidate || candidate.length > MAX_IP_LENGTH || isIP(candidate) === 0) {
    return null;
  }

  return candidate;
}

function hashClientFingerprint(headerStore: Headers): string {
  const material = [
    headerStore.get("user-agent") ?? "",
    headerStore.get("accept-language") ?? "",
    headerStore.get("sec-ch-ua") ?? "",
  ].join("|");

  return createHash("sha256").update(material).digest("hex").slice(0, 16);
}

function readForwardedClientIp(headerStore: Headers): string | null {
  const forwardedFor = headerStore.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = normalizeTrustedIp(forwardedFor.split(",")[0] ?? null);
    if (firstIp) {
      return firstIp;
    }
  }

  return normalizeTrustedIp(headerStore.get("x-real-ip"));
}

export async function getRequestClientIp(
  options: GetRequestClientIpOptions,
): Promise<string> {
  const headerStore = await headers();
  const connectingIp = normalizeTrustedIp(
    headerStore.get(CONNECTING_IP_HEADER),
  );

  if (options.trustProxy) {
    const proxyIsTrusted =
      connectingIp &&
      options.trustedProxyCidrs &&
      isIpv4InAnyCidr(connectingIp, options.trustedProxyCidrs);

    if (proxyIsTrusted) {
      const forwardedIp = readForwardedClientIp(headerStore);
      if (forwardedIp) {
        return forwardedIp;
      }
    }

    if (connectingIp) {
      return connectingIp;
    }

    return `fp:${hashClientFingerprint(headerStore)}`;
  }

  if (options.localFallback) {
    return options.localFallback;
  }

  if (connectingIp) {
    return connectingIp;
  }

  return `fp:${hashClientFingerprint(headerStore)}`;
}
