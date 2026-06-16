import { describe, expect, it } from "vitest";

import { isIpv4InAnyCidr, isIpv4InCidr, isValidCidrList, isValidIpv4Cidr } from "@/lib/security/cidr";

describe("isValidIpv4Cidr", () => {
  it("accepts valid IPv4 CIDR values", () => {
    expect(isValidIpv4Cidr("203.0.113.0/24")).toBe(true);
    expect(isValidIpv4Cidr("198.51.100.42/32")).toBe(true);
  });

  it("rejects host bits outside the network prefix", () => {
    expect(isValidIpv4Cidr("10.0.0.1/24")).toBe(false);
    expect(isValidIpv4Cidr("192.168.1.255/24")).toBe(false);
  });

  it("rejects /0 networks", () => {
    expect(isValidIpv4Cidr("0.0.0.0/0")).toBe(false);
    expect(isValidIpv4Cidr("0.0.0.1/0")).toBe(false);
  });

  it("rejects invalid prefixes and octets", () => {
    expect(isValidIpv4Cidr("256.0.0.0/24")).toBe(false);
    expect(isValidIpv4Cidr("10.0.0.0/33")).toBe(false);
    expect(isValidIpv4Cidr("not-a-cidr")).toBe(false);
  });
});

describe("isValidCidrList", () => {
  it("accepts comma-separated CIDR lists", () => {
    expect(isValidCidrList("203.0.113.0/24,198.51.100.42/32")).toBe(true);
  });

  it("rejects empty and malformed lists", () => {
    expect(isValidCidrList("")).toBe(false);
    expect(isValidCidrList("203.0.113.0/24,invalid")).toBe(false);
  });
});

describe("isIpv4InCidr", () => {
  it("matches addresses inside a CIDR block", () => {
    expect(isIpv4InCidr("10.0.0.5", "10.0.0.0/8")).toBe(true);
    expect(isIpv4InCidr("203.0.113.10", "203.0.113.0/24")).toBe(true);
  });

  it("rejects addresses outside a CIDR block", () => {
    expect(isIpv4InCidr("203.0.114.1", "203.0.113.0/24")).toBe(false);
  });

  it("checks comma-separated CIDR lists", () => {
    expect(isIpv4InAnyCidr("10.1.2.3", "203.0.113.0/24,10.0.0.0/8")).toBe(
      true,
    );
  });
});
