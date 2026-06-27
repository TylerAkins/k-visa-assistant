import { describe, expect, it } from "vitest";

import { calculateCaseProgress, getCaseProgressState } from "@/features/cases/server/progress";

describe("case progress", () => {
  it("starts cases at 0 percent", () => {
    expect(
      calculateCaseProgress({
        hasPetitioner: false,
        petitionerComplete: false,
        petitionerCompletionRatio: 0,
        hasBeneficiary: false,
        beneficiaryComplete: false,
        beneficiaryCompletionRatio: 0,
        hasChildren: false,
        childrenReviewed: false,
        readyForQuestionnaire: false,
        questionnaireCompletionRatio: 0,
      }),
    ).toBe(0);
  });

  it("caps progress at 100 percent", () => {
    expect(
      calculateCaseProgress({
        hasPetitioner: true,
        petitionerComplete: true,
        petitionerCompletionRatio: 1,
        hasBeneficiary: true,
        beneficiaryComplete: true,
        beneficiaryCompletionRatio: 1,
        hasChildren: true,
        childrenReviewed: true,
        readyForQuestionnaire: true,
        questionnaireCompletionRatio: 1,
      }),
    ).toBe(100);
  });

  it("derives readiness from person completeness", () => {
    const state = getCaseProgressState({
      petitioner: {
        firstName: "Tyler",
        lastName: "Akins",
        dateOfBirth: "1990-01-01",
        countryOfBirth: "United States",
        citizenship: "United States",
        email: "tyler@example.com",
        phone: "555-111-2222",
        street1: "123 Main St",
        city: "Austin",
        postalCode: "78701",
        country: "United States",
      },
      beneficiary: null,
      childrenCount: 0,
      childrenReviewed: false,
    });

    expect(state.petitionerComplete).toBe(true);
    expect(state.petitionerCompletionRatio).toBe(1);
    expect(state.readyForQuestionnaire).toBe(false);
  });

  it("credits partial person form completion", () => {
    const state = getCaseProgressState({
      petitioner: {
        firstName: "Tyler",
        lastName: "Akins",
        dateOfBirth: null,
        countryOfBirth: "United States",
        citizenship: "United States",
        email: "",
        phone: "",
        street1: "123 Main St",
        city: "Austin",
        postalCode: "",
        country: "United States",
      },
      beneficiary: null,
      childrenCount: 0,
      childrenReviewed: true,
    });

    expect(state.petitionerComplete).toBe(false);
    expect(calculateCaseProgress(state)).toBe(29);
  });

  it.each([
    [0, 70],
    [0.25, 78],
    [0.5, 85],
    [0.75, 93],
    [1, 100],
  ])(
    "allocates questionnaire completion ratio %s within the final 30 percent",
    (questionnaireCompletionRatio, expectedProgress) => {
      const completePerson = {
        firstName: "Tyler",
        lastName: "Akins",
        dateOfBirth: "1990-01-01",
        countryOfBirth: "United States",
        citizenship: "United States",
        email: "tyler@example.com",
        phone: "555-111-2222",
        street1: "123 Main St",
        city: "Austin",
        postalCode: "78701",
        country: "United States",
      };
      const state = getCaseProgressState({
        petitioner: completePerson,
        beneficiary: completePerson,
        childrenCount: 0,
        childrenReviewed: true,
        questionnaireCompletionRatio,
      });

      expect(calculateCaseProgress(state)).toBe(expectedProgress);
    },
  );

  it("allows the children section to be reviewed without child records", () => {
    const state = getCaseProgressState({
      petitioner: {
        firstName: "Tyler",
        lastName: "Akins",
        dateOfBirth: "1990-01-01",
        countryOfBirth: "United States",
        citizenship: "United States",
        email: "tyler@example.com",
        phone: "555-111-2222",
        street1: "123 Main St",
        city: "Austin",
        postalCode: "78701",
        country: "United States",
      },
      beneficiary: {
        firstName: "Van",
        lastName: "Nguyen",
        dateOfBirth: "1992-01-01",
        countryOfBirth: "Vietnam",
        citizenship: "Vietnam",
        email: "van@example.com",
        phone: "555-333-4444",
        street1: "456 Oak Ave",
        city: "Austin",
        postalCode: "78701",
        country: "United States",
      },
      childrenCount: 0,
      childrenReviewed: true,
    });

    expect(state.hasChildren).toBe(false);
    expect(state.childrenReviewed).toBe(true);
    expect(calculateCaseProgress(state)).toBe(70);
  });
});
