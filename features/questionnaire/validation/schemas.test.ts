import { describe, expect, it } from "vitest";

import {
  parseQuestionnaireQuestionConfig,
  questionnaireQuestionTypeSchema,
  questionnaireCaseStateSchema,
  upsertQuestionnaireAnswerSchema,
} from "@/features/questionnaire/validation/schemas";

describe("questionnaire validation", () => {
  it("accepts plain JSON answer values", () => {
    expect(
      upsertQuestionnaireAnswerSchema.parse({
        questionKey: "relationship_history",
        value: {
          metInPerson: true,
          visits: [{ country: "Vietnam", year: 2025 }],
        },
      }),
    ).toMatchObject({
      questionKey: "relationship_history",
      value: {
        metInPerson: true,
        visits: [{ country: "Vietnam", year: 2025 }],
      },
    });
  });

  it("rejects non-JSON answer values", () => {
    expect(() =>
      upsertQuestionnaireAnswerSchema.parse({
        questionKey: "relationship_history",
        value: { callback: () => null },
      }),
    ).toThrow();
  });

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
      }),
    ).toEqual({
      options: [{ label: "Naturalization", value: "naturalization" }],
    });
  });

  it("rejects unsupported question types and unexpected config", () => {
    expect(() => questionnaireQuestionTypeSchema.parse("file")).toThrow();
    expect(() =>
      parseQuestionnaireQuestionConfig("text", {
        options: [{ label: "Ignored", value: "ignored" }],
      }),
    ).toThrow('Question type "text" does not support configuration yet.');
  });
});
