import { describe, expect, it } from "vitest";

import {
  parseQuestionnaireQuestionConfig,
  questionnaireQuestionTypeSchema,
  questionnaireCaseStateSchema,
} from "@/features/questionnaire/validation/schemas";

describe("questionnaire validation", () => {
  it("rejects invalid review statuses", () => {
    expect(() =>
      questionnaireCaseStateSchema.parse({
        reviewStatus: "done",
      }),
    ).toThrow();
  });

  it("accepts supported question types and select config", () => {
    expect(questionnaireQuestionTypeSchema.parse("textarea")).toBe("textarea");
    expect(
      parseQuestionnaireQuestionConfig("select", {
        options: [{ label: "Naturalization", value: "naturalization" }],
        visibleWhen: {
          questionKey: "met_in_person",
          equals: true,
        },
      }),
    ).toEqual({
      options: [{ label: "Naturalization", value: "naturalization" }],
      visibleWhen: {
        questionKey: "met_in_person",
        equals: true,
      },
    });
  });

  it("accepts conditional config for non-select questions", () => {
    expect(
      parseQuestionnaireQuestionConfig("textarea", {
        visibleWhen: {
          questionKey: "met_in_person",
          equals: false,
        },
      }),
    ).toEqual({
      visibleWhen: {
        questionKey: "met_in_person",
        equals: false,
      },
    });
  });

  it("rejects unsupported question types and unexpected config", () => {
    expect(() => questionnaireQuestionTypeSchema.parse("file")).toThrow();
    expect(() =>
      parseQuestionnaireQuestionConfig("text", {
        options: [{ label: "Ignored", value: "ignored" }],
      }),
    ).toThrow();
  });

  it("rejects invalid visibility conditions", () => {
    expect(() =>
      parseQuestionnaireQuestionConfig("textarea", {
        visibleWhen: {
          questionKey: "Met in person?",
          equals: false,
        },
      }),
    ).toThrow();

    expect(() =>
      parseQuestionnaireQuestionConfig("textarea", {
        visibleWhen: {
          questionKey: "met_in_person",
        },
      }),
    ).toThrow();
  });
});
