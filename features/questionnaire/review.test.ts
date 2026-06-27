import { describe, expect, it } from "vitest";

import { buildQuestionnaireReview } from "@/features/questionnaire/review";
import type { QuestionnaireForCase } from "@/features/questionnaire/types";

const updatedAt = new Date("2026-01-01T00:00:00.000Z");

function createQuestionnaire(): QuestionnaireForCase {
  return {
    sections: [
      {
        id: "section-petitioner",
        key: "petitioner",
        title: "Petitioner",
        description: "Petitioner details.",
        sortOrder: 10,
        questions: [
          {
            id: "question-basis",
            key: "citizenship_basis",
            label: "Citizenship basis",
            helpText: null,
            questionType: "select",
            required: true,
            sortOrder: 10,
            config: {
              options: [{ label: "Naturalization", value: "naturalization" }],
            },
          },
          {
            id: "question-other-names",
            key: "other_names",
            label: "Other names",
            helpText: null,
            questionType: "text",
            required: false,
            sortOrder: 20,
            config: null,
          },
        ],
      },
      {
        id: "section-relationship",
        key: "relationship",
        title: "Relationship",
        description: null,
        sortOrder: 30,
        questions: [
          {
            id: "question-met",
            key: "met_in_person",
            label: "Met in person",
            helpText: null,
            questionType: "boolean",
            required: true,
            sortOrder: 10,
            config: null,
          },
          {
            id: "question-waiver",
            key: "waiver_explanation",
            label: "Waiver explanation",
            helpText: null,
            questionType: "textarea",
            required: true,
            sortOrder: 20,
            config: {
              visibleWhen: { questionKey: "met_in_person", equals: false },
            },
          },
        ],
      },
    ],
    answers: [],
    state: null,
    progress: {
      completedSections: 0,
      totalSections: 2,
      percent: 0,
      sections: [
        { sectionKey: "petitioner", complete: false },
        { sectionKey: "relationship", complete: false },
      ],
    },
  };
}

describe("buildQuestionnaireReview", () => {
  it("formats completed answers and preserves section order", () => {
    const questionnaire = createQuestionnaire();
    questionnaire.answers = [
      {
        caseId: "case-1",
        questionId: "question-basis",
        questionKey: "citizenship_basis",
        value: "naturalization",
        updatedAt,
      },
      {
        caseId: "case-1",
        questionId: "question-other-names",
        questionKey: "other_names",
        value: null,
        updatedAt,
      },
      {
        caseId: "case-1",
        questionId: "question-met",
        questionKey: "met_in_person",
        value: true,
        updatedAt,
      },
    ];

    expect(buildQuestionnaireReview(questionnaire)).toEqual({
      sections: [
        expect.objectContaining({
          key: "petitioner",
          complete: true,
          questions: [
            expect.objectContaining({
              displayValue: "Naturalization",
              status: "answered",
            }),
            expect.objectContaining({
              displayValue: "Not provided",
              status: "not_provided",
              error: null,
            }),
          ],
        }),
        expect.objectContaining({
          key: "relationship",
          complete: true,
          questions: [
            expect.objectContaining({ displayValue: "Yes" }),
          ],
        }),
      ],
    });
  });

  it("marks missing required and invalid persisted answers", () => {
    const questionnaire = createQuestionnaire();
    questionnaire.answers = [
      {
        caseId: "case-1",
        questionId: "question-basis",
        questionKey: "citizenship_basis",
        value: "unsupported",
        updatedAt,
      },
    ];

    const review = buildQuestionnaireReview(questionnaire);

    expect(review.sections[0]).toMatchObject({
      complete: false,
      questions: [
        {
          displayValue: "unsupported",
          status: "invalid",
          error: 'Choose a valid option for "Citizenship basis".',
        },
        {
          displayValue: "Not provided",
          status: "not_provided",
          error: null,
        },
      ],
    });
    expect(review.sections[1]?.questions[0]).toMatchObject({
      displayValue: "Not provided",
      status: "missing",
      error: 'Please answer "Met in person" before saving.',
    });
  });

  it("shows conditional questions only when their dependency matches", () => {
    const questionnaire = createQuestionnaire();
    questionnaire.answers = [
      {
        caseId: "case-1",
        questionId: "question-met",
        questionKey: "met_in_person",
        value: false,
        updatedAt,
      },
    ];

    const review = buildQuestionnaireReview(questionnaire);

    expect(review.sections[1]?.questions).toEqual([
      expect.objectContaining({ displayValue: "No", status: "answered" }),
      expect.objectContaining({
        key: "waiver_explanation",
        status: "missing",
      }),
    ]);
  });
});
