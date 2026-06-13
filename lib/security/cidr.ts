function ipv4ToInt(octets: [number, number, number, number]): number {
  const [a, b, c, d] = octets;
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function isCanonicalNetworkAddress(
  octets: [number, number, number, number],
  prefix: number,
): boolean {
  const ip = ipv4ToInt(octets);

  const mask =
    prefix === 32 ? 0xffff_ffff : ((0xffff_ffff << (32 - prefix)) >>> 0);
  const network = (ip & mask) >>> 0;

  return ip === network;
}

export function isValidIpv4Cidr(value: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(
    value,
  );

  if (!match) {
    return false;
  }

  const octets: [number, number, number, number] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  ];
  const prefix = Number(match[5]);

  if (prefix < 1 || prefix > 32) {
    return false;
  }

  if (!octets.every((octet) => octet >= 0 && octet <= 255)) {
    return false;
  }

  return isCanonicalNetworkAddress(octets, prefix);
}

export function isValidCidrList(value: string): boolean {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return false;
  }

  return parts.every(isValidIpv4Cidr);
}
