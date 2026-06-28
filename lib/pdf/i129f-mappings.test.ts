import { describe, expect, it } from "vitest";

import { i129fQuestionnaireMappings } from "@/lib/pdf/i129f-mappings";
import { mapQuestionnaireAnswersToPdfFields } from "@/lib/pdf/mappings";

const baseAnswers = {
  petitioner_other_names: "Taylor Previous",
  petitioner_citizenship_basis: "birth_us",
  beneficiary_currently_in_us: true,
  beneficiary_passport_number: "P1234567",
  beneficiary_passport_expiration: "2030-04-05",
  familial_relationship: true,
  familial_relationship_details: "Third cousin",
  met_in_person: true,
  most_recent_meeting_date: "2026-01-15",
  in_person_meeting_details: "Met in Chicago for one week.",
  relationship_history: "Introduced by mutual friends.",
};

describe("I-129F questionnaire mappings", () => {
  it("maps the current in-person questionnaire branch to verified XFA fields", () => {
    expect(
      mapQuestionnaireAnswersToPdfFields(
        i129fQuestionnaireMappings,
        baseAnswers,
      ),
    ).toEqual({
      success: true,
      fields: {
        Line3a_PageNumber: "1",
        Line3b_PartNumber: "1",
        Line3c_ItemNumber: "7",
        Line3d_AdditionalInfo: "Taylor Previous",
        Pt1Line40_Checkbox: "A",
        Pt2Line37_Checkboxes: "Y",
        Pt2Line38e_Passport: "P1234567",
        Pt2Line38h_ExpDate: "04/05/2030",
        Pt2Line51_Checkboxes: "Y",
        Pt2Line52_Relationship: "Third cousin",
        Pt2Line53_Checkboxes: "Y",
        Pt2Line54_Describe:
          "Most recent in-person meeting date: 01/15/2026\n" +
          "In-person meeting details: Met in Chicago for one week.\n" +
          "Relationship history: Introduced by mutual friends.",
      },
    });
  });

  it("maps the waiver branch without requiring hidden-branch answers", () => {
    const result = mapQuestionnaireAnswersToPdfFields(
      i129fQuestionnaireMappings,
      {
        petitioner_citizenship_basis: "naturalization",
        beneficiary_currently_in_us: true,
        beneficiary_passport_number: "P1234567",
        beneficiary_passport_expiration: "2030-04-05",
        familial_relationship: false,
        met_in_person: false,
        meeting_waiver_explanation: "Travel would cause extreme hardship.",
        relationship_history: "Introduced online by mutual friends.",
      },
    );

    expect(result).toEqual({
      success: true,
      fields: {
        Pt1Line40_Checkbox: "B",
        Pt2Line37_Checkboxes: "Y",
        Pt2Line38e_Passport: "P1234567",
        Pt2Line38h_ExpDate: "04/05/2030",
        Pt2Line51_Checkboxes: "N",
        Pt2Line53_Checkboxes: "N",
        Pt2Line54_Describe:
          "Meeting waiver explanation: Travel would cause extreme hardship.\n" +
          "Relationship history: Introduced online by mutual friends.",
      },
    });
  });

  it("does not treat current absence as no prior U.S. presence", () => {
    const result = mapQuestionnaireAnswersToPdfFields(
      i129fQuestionnaireMappings,
      { ...baseAnswers, beneficiary_currently_in_us: false },
    );

    expect(result).toMatchObject({
      success: false,
      errors: [
        {
          code: "invalid_input",
          mappingId: "beneficiary-us-presence",
          questionKeys: ["beneficiary_currently_in_us"],
          targetFields: ["Pt2Line37_Checkboxes"],
        },
      ],
    });
  });

  it("reports every required answer missing from an active branch", () => {
    const result = mapQuestionnaireAnswersToPdfFields(
      i129fQuestionnaireMappings,
      {
        petitioner_citizenship_basis: "birth_us",
        beneficiary_currently_in_us: true,
        familial_relationship: true,
        met_in_person: true,
      },
    );

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors.map((error) => error.questionKeys[0])).toEqual([
      "beneficiary_passport_number",
      "beneficiary_passport_expiration",
      "familial_relationship_details",
      "most_recent_meeting_date",
      "in_person_meeting_details",
      "relationship_history",
    ]);
  });

  it("rejects the ambiguous certificate answer instead of mapping it incorrectly", () => {
    const result = mapQuestionnaireAnswersToPdfFields(
      i129fQuestionnaireMappings,
      { ...baseAnswers, petitioner_citizenship_basis: "certificate" },
    );

    expect(result).toMatchObject({
      success: false,
      errors: [
        {
          code: "invalid_input",
          mappingId: "petitioner-citizenship-basis",
          questionKeys: ["petitioner_citizenship_basis"],
          targetFields: ["Pt1Line40_Checkbox"],
        },
      ],
    });
  });

  it("covers every current persisted questionnaire answer key", () => {
    const currentQuestionKeys = [
      "petitioner_other_names",
      "petitioner_citizenship_basis",
      "beneficiary_currently_in_us",
      "beneficiary_passport_number",
      "beneficiary_passport_expiration",
      "familial_relationship",
      "familial_relationship_details",
      "met_in_person",
      "most_recent_meeting_date",
      "in_person_meeting_details",
      "meeting_waiver_explanation",
      "relationship_history",
    ];
    const keysFromMappings = new Set(
      i129fQuestionnaireMappings.flatMap((mapping) =>
        mapping.type === "compose"
          ? mapping.inputs.map((input) => input.questionKey)
          : [mapping.questionKey],
      ),
    );

    expect(keysFromMappings).toEqual(new Set(currentQuestionKeys));
  });
});
