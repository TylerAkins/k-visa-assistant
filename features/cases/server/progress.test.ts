import { describe, expect, it } from "vitest";

import { calculateCaseProgress, getCaseProgressState } from "@/features/cases/server/progress";

describe("case progress", () => {
  it("starts cases at 10 percent", () => {
    expect(
      calculateCaseProgress({
        hasPetitioner: false,
        petitionerComplete: false,
        hasBeneficiary: false,
        beneficiaryComplete: false,
        hasChildren: false,
        childrenReviewed: false,
        readyForQuestionnaire: false,
      }),
    ).toBe(10);
  });

  it("caps progress at 100 percent", () => {
    expect(
      calculateCaseProgress({
        hasPetitioner: true,
        petitionerComplete: true,
        hasBeneficiary: true,
        beneficiaryComplete: true,
        hasChildren: true,
        childrenReviewed: true,
        readyForQuestionnaire: true,
      }),
    ).toBe(100);
  });

  it("derives readiness from person completeness", () => {
    const state = getCaseProgressState({
      petitioner: {
        firstName: "Tyler",
        lastName: "Akins",
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
    expect(state.readyForQuestionnaire).toBe(false);
  });

  it("allows the children section to be reviewed without child records", () => {
    const state = getCaseProgressState({
      petitioner: {
        firstName: "Tyler",
        lastName: "Akins",
        street1: "123 Main St",
        city: "Austin",
        postalCode: "78701",
        country: "United States",
      },
      beneficiary: {
        firstName: "Van",
        lastName: "Nguyen",
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
    expect(calculateCaseProgress(state)).toBe(100);
  });
});
