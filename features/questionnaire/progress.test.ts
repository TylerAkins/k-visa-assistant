import { describe, expect, it } from "vitest";

import { calculateQuestionnaireProgress } from "@/features/questionnaire/progress";
import type {
  QuestionnaireAnswer,
  QuestionnaireQuestion,
  QuestionnaireSection,
} from "@/features/questionnaire/types";

function question(
  key: string,
  overrides: Partial<QuestionnaireQuestion> = {},
): QuestionnaireQuestion {
  return {
    id: `question-${key}`,
    key,
    label: key,
    helpText: null,
    questionType: "text",
    required: false,
    sortOrder: 10,
    config: null,
    ...overrides,
  };
}

function section(
  key: QuestionnaireSection["key"],
  questions: QuestionnaireQuestion[],
): QuestionnaireSection {
  return {
    id: `section-${key}`,
    key,
    title: key,
    description: null,
    sortOrder: 10,
    questions,
  };
}

function answer(
  questionKey: string,
  value: QuestionnaireAnswer["value"],
): QuestionnaireAnswer {
  return {
    caseId: "case-1",
    questionId: `question-${questionKey}`,
    questionKey,
    value,
    updatedAt: new Date("2026-06-26T00:00:00.000Z"),
  };
}

describe("questionnaire progress", () => {
  it("keeps empty and unsaved sections incomplete", () => {
    expect(
      calculateQuestionnaireProgress(
        [
          section("petitioner", []),
          section("beneficiary", [question("optional")]),
        ],
        [],
      ),
    ).toEqual({
      completedSections: 0,
      totalSections: 2,
      percent: 0,
      sections: [
        { sectionKey: "petitioner", complete: false },
        { sectionKey: "beneficiary", complete: false },
      ],
    });
  });

  it("completes an optional-only section after null values are saved", () => {
    const progress = calculateQuestionnaireProgress(
      [section("children", [question("notes")])],
      [answer("notes", null)],
    );

    expect(progress.completedSections).toBe(1);
    expect(progress.percent).toBe(100);
  });

  it("requires valid values for required and optional visible answers", () => {
    const sections = [
      section("beneficiary", [
        question("required_date", { questionType: "date", required: true }),
        question("optional_choice", {
          questionType: "select",
          config: { options: [{ label: "Allowed", value: "allowed" }] },
        }),
      ]),
    ];

    expect(
      calculateQuestionnaireProgress(sections, [
        answer("required_date", null),
        answer("optional_choice", "allowed"),
      ]).completedSections,
    ).toBe(0);
    expect(
      calculateQuestionnaireProgress(sections, [
        answer("required_date", "2026-02-30"),
        answer("optional_choice", "allowed"),
      ]).completedSections,
    ).toBe(0);
    expect(
      calculateQuestionnaireProgress(sections, [
        answer("required_date", "2026-06-26"),
        answer("optional_choice", "invalid"),
      ]).completedSections,
    ).toBe(0);
    expect(
      calculateQuestionnaireProgress(sections, [
        answer("required_date", "2026-06-26"),
        answer("optional_choice", null),
      ]).completedSections,
    ).toBe(1);
  });

  it("ignores hidden required questions and requires them when visible", () => {
    const conditionalSection = section("relationship", [
      question("met_in_person", {
        questionType: "boolean",
        required: true,
      }),
      question("waiver", {
        required: true,
        config: {
          visibleWhen: { questionKey: "met_in_person", equals: false },
        },
      }),
    ]);

    expect(
      calculateQuestionnaireProgress(
        [conditionalSection],
        [answer("met_in_person", true)],
      ).completedSections,
    ).toBe(1);
    expect(
      calculateQuestionnaireProgress(
        [conditionalSection],
        [answer("met_in_person", false)],
      ).completedSections,
    ).toBe(0);
    expect(
      calculateQuestionnaireProgress(
        [conditionalSection],
        [answer("met_in_person", false), answer("waiver", "Explanation")],
      ).completedSections,
    ).toBe(1);
  });

  it.each([
    [0, 0],
    [1, 25],
    [2, 50],
    [3, 75],
    [4, 100],
  ])("reports %s of four sections as %s percent", (completed, percent) => {
    const sectionKeys = [
      "petitioner",
      "beneficiary",
      "relationship",
      "children",
    ] as const;
    const sections = sectionKeys.map((sectionKey, index) =>
      section(sectionKey, [question(`answer-${index}`)]),
    );
    const answers = Array.from({ length: completed }, (_, index) =>
      answer(`answer-${index}`, null),
    );

    expect(calculateQuestionnaireProgress(sections, answers)).toMatchObject({
      completedSections: completed,
      totalSections: 4,
      percent,
    });
  });
});
