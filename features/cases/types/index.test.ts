import { describe, expect, it } from "vitest";

import type {
  CaseOverviewData,
  CaseRecord,
  ChildSummary,
  PersonSummary,
  ProgressState,
} from "@/features/cases/types";

describe("case types", () => {
  it("models a case overview with petitioner, beneficiary, and children", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const caseRecord: CaseRecord = {
      id: "case-1",
      userId: "user-1",
      title: "Tyler & Van",
      status: "draft",
      progressPercent: 50,
      childrenReviewed: true,
      createdAt: now,
      updatedAt: now,
    };
    const petitioner: PersonSummary = {
      firstName: "Tyler",
      middleName: null,
      lastName: "Akins",
      dateOfBirth: now,
      countryOfBirth: "United States",
      citizenship: "United States",
      email: "tyler@example.com",
      phone: "555-111-2222",
      street1: "123 Main St",
      street2: null,
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "United States",
    };
    const child: ChildSummary = {
      id: "child-1",
      firstName: "Kai",
      middleName: null,
      lastName: "Nguyen",
      dateOfBirth: now,
      citizenship: "Vietnam",
      relationshipType: "child",
    };
    const overview: CaseOverviewData = {
      case: caseRecord,
      petitioner,
      beneficiary: null,
      children: [child],
    };

    expect(overview.case.status).toBe("draft");
    expect(overview.petitioner?.state).toBe("TX");
    expect(overview.children).toHaveLength(1);
  });

  it("models derived progress state", () => {
    const progress: ProgressState = {
      hasPetitioner: true,
      petitionerComplete: true,
      petitionerCompletionRatio: 1,
      hasBeneficiary: false,
      beneficiaryComplete: false,
      beneficiaryCompletionRatio: 0,
      hasChildren: false,
      childrenReviewed: true,
      readyForQuestionnaire: false,
    };

    expect(progress.petitionerCompletionRatio).toBe(1);
    expect(progress.readyForQuestionnaire).toBe(false);
  });
});
