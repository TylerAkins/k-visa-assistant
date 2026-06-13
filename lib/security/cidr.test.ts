import { describe, expect, it } from "vitest";

import { isValidCidrList, isValidIpv4Cidr } from "@/lib/security/cidr";

describe("isValidIpv4Cidr", () => {
  it("accepts valid IPv4 CIDR values", () => {
    expect(isValidIpv4Cidr("203.0.113.0/24")).toBe(true);
    expect(isValidIpv4Cidr("198.51.100.42/32")).toBe(true);
  });

  it("rejects host bits outside the network prefix", () => {
    expect(isValidIpv4Cidr("10.0.0.1/24")).toBe(false);
    expect(isValidIpv4Cidr("192.168.1.255/24")).toBe(false);
  });

  it("accepts only canonical /0 networks", () => {
    expect(isValidIpv4Cidr("0.0.0.0/0")).toBe(true);
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
