import { describe, expect, it } from "vitest";

import {
  beneficiarySchema,
  caseTitleSchema,
  childSchema,
  petitionerSchema,
} from "@/features/cases/validation/schemas";

describe("case validation schemas", () => {
  it("accepts a case title", () => {
    expect(caseTitleSchema.safeParse({ title: "Tyler & Van" }).success).toBe(true);
  });

  it("rejects an empty petitioner name", () => {
    expect(
      petitionerSchema.safeParse({
        firstName: "",
        middleName: "",
        lastName: "Akins",
        dateOfBirth: "1990-01-01",
        countryOfBirth: "United States",
        citizenship: "United States",
        email: "tyler@example.com",
        phone: "",
        street1: "123 Main St",
        street2: "",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "United States",
      }).success,
    ).toBe(false);
  });

  it("validates beneficiary contact and address fields", () => {
    expect(
      beneficiarySchema.safeParse({
        firstName: "Van",
        middleName: "",
        lastName: "Nguyen",
        dateOfBirth: "1992-04-12",
        countryOfBirth: "Vietnam",
        citizenship: "Vietnam",
        email: "van@example.com",
        phone: "",
        street1: "456 Oak Ave",
        street2: "",
        city: "Austin",
        province: "Texas",
        postalCode: "78701",
        country: "United States",
      }).success,
    ).toBe(true);
  });

  it("allows blank optional date and email fields from browser forms", () => {
    const result = petitionerSchema.safeParse({
      firstName: "Tyler",
      middleName: "",
      lastName: "Akins",
      dateOfBirth: "",
      countryOfBirth: "",
      citizenship: "",
      email: "",
      phone: "",
      street1: "123 Main St",
      street2: "",
      city: "Austin",
      state: "",
      postalCode: "78701",
      country: "United States",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeUndefined();
      expect(result.data.email).toBeUndefined();
    }
  });

  it("validates child records", () => {
    expect(
      childSchema.safeParse({
        firstName: "Kai",
        middleName: "",
        lastName: "Nguyen",
        dateOfBirth: "2018-01-01",
        citizenship: "Vietnam",
        relationshipType: "stepchild",
      }).success,
    ).toBe(true);
  });
});
