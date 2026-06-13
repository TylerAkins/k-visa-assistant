export function isValidIpv4Cidr(value: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(
    value,
  );

  if (!match) {
    return false;
  }

  const octets = [match[1], match[2], match[3], match[4]].map(Number);
  const prefix = Number(match[5]);

  if (prefix > 32) {
    return false;
  }

  return octets.every((octet) => octet >= 0 && octet <= 255);
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
