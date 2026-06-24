import { describe, expect, it } from "vitest";

import { kVisaCountryOptions } from "@/features/cases/types/k-visa-countries";

describe("kVisaCountryOptions", () => {
  it("includes common K visa interview countries", () => {
    expect(kVisaCountryOptions).toContain("United States");
    expect(kVisaCountryOptions).toContain("Vietnam");
    expect(kVisaCountryOptions).toContain("Philippines");
    expect(kVisaCountryOptions).toContain("Mexico");
  });

  it("contains non-empty unique display values", () => {
    const uniqueOptions = new Set(kVisaCountryOptions);

    expect(kVisaCountryOptions.length).toBeGreaterThan(100);
    expect(uniqueOptions.size).toBe(kVisaCountryOptions.length);
    expect(kVisaCountryOptions.every((country) => country.trim().length > 0))
      .toBe(true);
  });
});
