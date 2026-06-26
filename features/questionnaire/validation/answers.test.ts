import { describe, expect, it } from "vitest";

import type {
  QuestionnaireQuestion,
  QuestionnaireSection,
} from "@/features/questionnaire/types";
import {
  parseQuestionnaireAnswer,
  validateQuestionnaireSectionAnswers,
} from "@/features/questionnaire/validation/answers";

function createQuestion(
  overrides: Partial<QuestionnaireQuestion> = {},
): QuestionnaireQuestion {
  return {
    id: "question-text",
    key: "text_answer",
    label: "Text answer",
    helpText: null,
    questionType: "text",
    required: false,
    sortOrder: 10,
    config: null,
    ...overrides,
  };
}

function createSection(
  questions: QuestionnaireQuestion[],
): QuestionnaireSection {
  return {
    id: "section-relationship",
    key: "relationship",
    title: "Relationship",
    description: null,
    sortOrder: 30,
    questions,
  };
}

describe("questionnaire answer validation", () => {
  it("normalizes valid values for every supported question type", () => {
    expect(parseQuestionnaireAnswer(createQuestion(), "  answer  ")).toEqual({
      success: true,
      value: "answer",
    });
    expect(
      parseQuestionnaireAnswer(
        createQuestion({ questionType: "textarea" }),
        "   ",
      ),
    ).toEqual({ success: true, value: null });
    expect(
      parseQuestionnaireAnswer(
        createQuestion({ questionType: "date" }),
        "2026-06-26",
      ),
    ).toEqual({ success: true, value: "2026-06-26" });
    expect(
      parseQuestionnaireAnswer(
        createQuestion({ questionType: "boolean" }),
        "false",
      ),
    ).toEqual({ success: true, value: false });
    expect(
      parseQuestionnaireAnswer(
        createQuestion({
          questionType: "select",
          config: {
            options: [{ label: "Naturalization", value: "naturalization" }],
          },
        }),
        "naturalization",
      ),
    ).toEqual({ success: true, value: "naturalization" });
  });

  it("rejects required blanks and invalid typed values", () => {
    expect(
      parseQuestionnaireAnswer(createQuestion({ required: true }), "  "),
    ).toEqual({
      success: false,
      error: 'Please answer "Text answer" before saving.',
    });
    expect(
      parseQuestionnaireAnswer(
        createQuestion({ label: "Date answer", questionType: "date" }),
        "2026-02-30",
      ),
    ).toEqual({
      success: false,
      error: 'Enter a valid date for "Date answer".',
    });
    expect(
      parseQuestionnaireAnswer(
        createQuestion({ label: "Boolean answer", questionType: "boolean" }),
        "maybe",
      ),
    ).toEqual({
      success: false,
      error: 'Choose yes or no for "Boolean answer".',
    });
    expect(
      parseQuestionnaireAnswer(
        createQuestion({
          label: "Select answer",
          questionType: "select",
          config: { options: [{ label: "Allowed", value: "allowed" }] },
        }),
        "other",
      ),
    ).toEqual({
      success: false,
      error: 'Choose a valid option for "Select answer".',
    });
  });

  it("returns every visible field error without producing save values", () => {
    const section = createSection([
      createQuestion({ required: true }),
      createQuestion({
        id: "question-date",
        key: "date_answer",
        label: "Date answer",
        questionType: "date",
      }),
    ]);
    const formData = new FormData();
    formData.set("date_answer", "not-a-date");

    expect(
      validateQuestionnaireSectionAnswers(section, new Map(), formData),
    ).toEqual({
      success: false,
      fieldErrors: {
        text_answer: ['Please answer "Text answer" before saving.'],
        date_answer: ['Enter a valid date for "Date answer".'],
      },
    });
  });

  it("does not validate hidden required questions or accept hidden values", () => {
    const controllingQuestion = createQuestion({
      id: "question-met",
      key: "met_in_person",
      label: "Met in person",
      questionType: "boolean",
      required: true,
    });
    const hiddenQuestion = createQuestion({
      id: "question-waiver",
      key: "waiver_explanation",
      label: "Waiver explanation",
      questionType: "textarea",
      required: true,
      config: {
        visibleWhen: { questionKey: "met_in_person", equals: false },
      },
    });
    const formData = new FormData();
    formData.set("met_in_person", "true");
    formData.set("waiver_explanation", "Ignore this value");

    expect(
      validateQuestionnaireSectionAnswers(
        createSection([controllingQuestion, hiddenQuestion]),
        new Map([["waiver_explanation", "Previously saved"]]),
        formData,
      ),
    ).toEqual({
      success: true,
      answers: [{ questionKey: "met_in_person", value: true }],
      hiddenQuestionIds: ["question-waiver"],
    });
  });

  it("requires conditional questions when submitted dependencies match", () => {
    const controllingQuestion = createQuestion({
      id: "question-met",
      key: "met_in_person",
      questionType: "boolean",
    });
    const conditionalQuestion = createQuestion({
      id: "question-waiver",
      key: "waiver_explanation",
      label: "Waiver explanation",
      questionType: "textarea",
      required: true,
      config: {
        visibleWhen: { questionKey: "met_in_person", equals: false },
      },
    });
    const formData = new FormData();
    formData.set("met_in_person", "false");

    expect(
      validateQuestionnaireSectionAnswers(
        createSection([controllingQuestion, conditionalQuestion]),
        new Map(),
        formData,
      ),
    ).toEqual({
      success: false,
      fieldErrors: {
        waiver_explanation: [
          'Please answer "Waiver explanation" before saving.',
        ],
      },
    });
  });
});
