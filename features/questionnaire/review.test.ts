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
    children: [],
    childrenReviewed: false,
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

  it("summarizes canonical child records", () => {
    const questionnaire = createQuestionnaire();
    questionnaire.sections.push({
      id: "section-children",
      key: "children",
      title: "Children",
      description: "K-2 children",
      sortOrder: 40,
      questions: [],
    });
    questionnaire.childrenReviewed = true;
    questionnaire.children = [{
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Kai",
      middleName: null,
      lastName: "Nguyen",
      dateOfBirth: new Date("2018-01-01T00:00:00.000Z"),
      countryOfBirth: "Vietnam",
      citizenship: "Vietnam",
      relationshipType: "Child",
      residesWithBeneficiary: false,
      street1: "1 Main St",
      street2: null,
      city: "Hanoi",
      province: null,
      postalCode: "100000",
      country: "Vietnam",
      sortOrder: 0,
    }];
    questionnaire.progress.sections.push({ sectionKey: "children", complete: true });

    expect(buildQuestionnaireReview(questionnaire).sections[2]).toMatchObject({
      key: "children",
      complete: true,
      questions: [{
        label: "Child 1: Kai Nguyen",
        status: "answered",
        displayValue: expect.stringContaining("Address: 1 Main St, Hanoi"),
      }],
    });
  });

  it("marks only incomplete child records invalid", () => {
    const questionnaire = createQuestionnaire();
    questionnaire.sections.push({
      id: "section-children",
      key: "children",
      title: "Children",
      description: null,
      sortOrder: 40,
      questions: [],
    });
    const completeChild = {
      id: "11111111-1111-4111-8111-111111111111",
      firstName: "Kai",
      middleName: null,
      lastName: "Nguyen",
      dateOfBirth: new Date("2018-01-01T00:00:00.000Z"),
      countryOfBirth: "Vietnam",
      citizenship: null,
      relationshipType: "Child",
      residesWithBeneficiary: true,
      street1: null,
      street2: null,
      city: null,
      province: null,
      postalCode: null,
      country: null,
      sortOrder: 0,
    };
    questionnaire.childrenReviewed = true;
    questionnaire.children = [
      completeChild,
      {
        ...completeChild,
        id: "22222222-2222-4222-8222-222222222222",
        firstName: "Mina",
        countryOfBirth: null,
        sortOrder: 1,
      },
    ];
    questionnaire.progress.sections.push({
      sectionKey: "children",
      complete: false,
    });

    expect(buildQuestionnaireReview(questionnaire).sections[2]?.questions).toEqual([
      expect.objectContaining({ status: "answered", error: null }),
      expect.objectContaining({ status: "invalid", error: expect.any(String) }),
    ]);
  });
});
