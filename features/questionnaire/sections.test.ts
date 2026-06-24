import { describe, expect, it } from "vitest";

import {
  assertCompleteQuestionnaireSectionIds,
  findMissingQuestionnaireSectionIds,
  findUnknownQuestionnaireSectionIds,
  getQuestionnaireSectionMetadata,
  listQuestionnaireSectionMetadata,
  questionnaireSectionIds,
} from "@/features/questionnaire/sections";

describe("questionnaire section registry", () => {
  it("defines stable Phase 3 section identifiers in display order", () => {
    expect(questionnaireSectionIds).toEqual([
      "petitioner",
      "beneficiary",
      "relationship",
      "children",
    ]);
    expect(
      listQuestionnaireSectionMetadata().map((section) => ({
        id: section.id,
        sortOrder: section.sortOrder,
      })),
    ).toEqual([
      { id: "petitioner", sortOrder: 10 },
      { id: "beneficiary", sortOrder: 20 },
      { id: "relationship", sortOrder: 30 },
      { id: "children", sortOrder: 40 },
    ]);
  });

  it("resolves known section metadata", () => {
    expect(getQuestionnaireSectionMetadata("relationship")).toMatchObject({
      id: "relationship",
      progressAttachment: "relationship",
      reviewAttachment: "questionnaire_case_state",
    });
  });

  it("detects missing and unknown section identifiers", () => {
    expect(
      findMissingQuestionnaireSectionIds(["petitioner", "relationship"]),
    ).toEqual(["beneficiary", "children"]);
    expect(
      findUnknownQuestionnaireSectionIds(["petitioner", "travel"]),
    ).toEqual(["travel"]);
    expect(() =>
      assertCompleteQuestionnaireSectionIds([
        "petitioner",
        "beneficiary",
        "relationship",
      ]),
    ).toThrow("Missing questionnaire section identifier(s): children.");
    expect(() =>
      assertCompleteQuestionnaireSectionIds([
        "petitioner",
        "beneficiary",
        "relationship",
        "children",
        "travel",
      ]),
    ).toThrow("Unknown questionnaire section identifier(s): travel.");
  });
});
