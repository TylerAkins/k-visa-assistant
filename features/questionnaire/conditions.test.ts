import { describe, expect, it } from "vitest";

import { isQuestionVisible } from "@/features/questionnaire/conditions";
import type { QuestionnaireQuestion } from "@/features/questionnaire/types";

const question = {
  id: "question-waiver",
  key: "meeting_waiver",
  label: "Meeting waiver",
  helpText: null,
  questionType: "textarea",
  required: true,
  sortOrder: 20,
  config: {
    visibleWhen: {
      questionKey: "met_in_person",
      equals: false,
    },
  },
} satisfies QuestionnaireQuestion;

describe("questionnaire conditions", () => {
  it("shows questions without visibility conditions", () => {
    expect(
      isQuestionVisible({ ...question, config: null }, new Map()),
    ).toBe(true);
  });

  it("shows questions when the dependency answer matches", () => {
    expect(
      isQuestionVisible(question, new Map([["met_in_person", false]])),
    ).toBe(true);
  });

  it("hides questions when the dependency answer does not match", () => {
    expect(
      isQuestionVisible(question, new Map([["met_in_person", true]])),
    ).toBe(false);
  });

  it("hides questions when the dependency answer is missing", () => {
    expect(isQuestionVisible(question, new Map())).toBe(false);
  });

  it("matches missing dependency answers to null conditions", () => {
    expect(
      isQuestionVisible(
        {
          ...question,
          config: {
            visibleWhen: {
              questionKey: "optional_detail",
              equals: null,
            },
          },
        },
        new Map(),
      ),
    ).toBe(true);
  });
});
