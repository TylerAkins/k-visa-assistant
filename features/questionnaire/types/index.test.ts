import { describe, expect, it } from "vitest";

import type {
  QuestionnaireAnswerValue,
  QuestionnaireReviewStatus,
} from "@/features/questionnaire/types";

describe("questionnaire types", () => {
  it("accepts the supported answer and review status shapes", () => {
    const answer: QuestionnaireAnswerValue = {
      metInPerson: true,
      visits: [{ country: "Vietnam", year: 2025 }],
    };
    const reviewStatus: QuestionnaireReviewStatus = "in_review";

    expect(answer).toMatchObject({ metInPerson: true });
    expect(reviewStatus).toBe("in_review");
  });
});
