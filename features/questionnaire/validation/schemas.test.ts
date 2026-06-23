import { describe, expect, it } from "vitest";

import {
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
});
