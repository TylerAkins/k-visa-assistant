function ipv4ToInt(octets: [number, number, number, number]): number {
  const [a, b, c, d] = octets;
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function parseIpv4(value: string): [number, number, number, number] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const octets: [number, number, number, number] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  ];

  if (!octets.every((octet) => octet >= 0 && octet <= 255)) {
    return null;
  }

  return octets;
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

export function isIpv4InCidr(ip: string, cidr: string): boolean {
  const ipOctets = parseIpv4(ip);
  const cidrMatch = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(
    cidr.trim(),
  );

  if (!ipOctets || !cidrMatch) {
    return false;
  }

  const networkOctets: [number, number, number, number] = [
    Number(cidrMatch[1]),
    Number(cidrMatch[2]),
    Number(cidrMatch[3]),
    Number(cidrMatch[4]),
  ];
  const prefix = Number(cidrMatch[5]);

  if (prefix < 0 || prefix > 32) {
    return false;
  }

  const ipInt = ipv4ToInt(ipOctets);
  const networkInt = ipv4ToInt(networkOctets);
  const mask =
    prefix === 0 ? 0 : prefix === 32 ? 0xffff_ffff : ((0xffff_ffff << (32 - prefix)) >>> 0);

  return (ipInt & mask) === (networkInt & mask);
}

export function isIpv4InAnyCidr(ip: string, cidrList: string): boolean {
  return cidrList
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .some((cidr) => isIpv4InCidr(ip, cidr));
}
