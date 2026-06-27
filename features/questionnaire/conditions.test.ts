import { describe, expect, it } from "vitest";

import {
  isQuestionVisible,
  pruneResolvedHiddenAnswers,
} from "@/features/questionnaire/conditions";
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

const passportQuestion = {
  ...question,
  id: "question-passport",
  key: "beneficiary_passport_number",
  label: "Passport number",
  config: {
    visibleWhen: {
      questionKey: "beneficiary_currently_in_us",
      equals: true,
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

  it("preserves saved conditional answers while a new dependency is unanswered", () => {
    const answers = new Map([
      ["beneficiary_passport_number", "X1234567"],
    ]);

    expect(
      pruneResolvedHiddenAnswers([passportQuestion], answers).get(
        "beneficiary_passport_number",
      ),
    ).toBe("X1234567");
  });

  it("prunes saved conditional answers after a dependency explicitly hides them", () => {
    const answers = new Map<string, string | boolean>([
      ["beneficiary_currently_in_us", false],
      ["beneficiary_passport_number", "X1234567"],
    ]);

    expect(
      pruneResolvedHiddenAnswers([passportQuestion], answers).has(
        "beneficiary_passport_number",
      ),
    ).toBe(false);
  });
});
