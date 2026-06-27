import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  QuestionField,
  QuestionnaireWorkflow,
} from "@/features/questionnaire/components/questionnaire";
import type { QuestionnaireForCase } from "@/features/questionnaire/types";

const questionnaire = {
  sections: [
    {
      id: "section-relationship",
      key: "relationship",
      title: "Relationship",
      description: "Relationship history and eligibility details.",
      sortOrder: 30,
      questions: [
        {
          id: "question-met",
          key: "met_in_person",
          label: "Have you met in person?",
          helpText: null,
          questionType: "boolean",
          required: true,
          sortOrder: 10,
          config: null,
        },
        {
          id: "question-history",
          key: "relationship_history",
          label: "Relationship history",
          helpText: "Describe how your relationship developed.",
          questionType: "textarea",
          required: false,
          sortOrder: 20,
          config: null,
        },
        {
          id: "question-waiver",
          key: "meeting_waiver_explanation",
          label: "Meeting waiver explanation",
          helpText: "Explain why the in-person meeting requirement does not apply.",
          questionType: "textarea",
          required: true,
          sortOrder: 25,
          config: {
            visibleWhen: {
              questionKey: "met_in_person",
              equals: false,
            },
          },
        },
        {
          id: "question-basis",
          key: "citizenship_basis",
          label: "Citizenship basis",
          helpText: null,
          questionType: "select",
          required: true,
          sortOrder: 30,
          config: {
            options: [{ label: "Naturalization", value: "naturalization" }],
          },
        },
      ],
    },
  ],
  answers: [
    {
      caseId: "case-1",
      questionId: "question-history",
      questionKey: "relationship_history",
      value: "We met in 2024.",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      caseId: "case-1",
      questionId: "question-met",
      questionKey: "met_in_person",
      value: true,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
  state: null,
  progress: {
    completedSections: 0,
    totalSections: 1,
    percent: 0,
    sections: [{ sectionKey: "relationship", complete: false }],
  },
} satisfies QuestionnaireForCase;

const successfulSave = {
  success: true as const,
  progressPercent: 70,
  questionnaireProgress: questionnaire.progress,
};

const petitionerQuestionnaire = {
  ...questionnaire,
  sections: [
    {
      id: "section-petitioner",
      key: "petitioner",
      title: "Petitioner",
      description: "U.S. citizen petitioner information for the case.",
      sortOrder: 10,
      questions: [
        {
          id: "question-petitioner-other-names",
          key: "petitioner_other_names",
          label: "Other names used",
          helpText: "List prior legal names, aliases, or maiden names.",
          questionType: "textarea",
          required: false,
          sortOrder: 10,
          config: null,
        },
        {
          id: "question-petitioner-citizenship-basis",
          key: "petitioner_citizenship_basis",
          label: "Citizenship basis",
          helpText: null,
          questionType: "select",
          required: true,
          sortOrder: 20,
          config: {
            options: [
              { label: "Birth in the United States", value: "birth_us" },
              { label: "Naturalization", value: "naturalization" },
              { label: "Certificate of citizenship", value: "certificate" },
            ],
          },
        },
      ],
    },
    ...questionnaire.sections,
  ],
  answers: [
    {
      caseId: "case-1",
      questionId: "question-petitioner-other-names",
      questionKey: "petitioner_other_names",
      value: "Taylor Previous",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      caseId: "case-1",
      questionId: "question-petitioner-citizenship-basis",
      questionKey: "petitioner_citizenship_basis",
      value: "naturalization",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
  progress: {
    completedSections: 1,
    totalSections: 2,
    percent: 50,
    sections: [
      { sectionKey: "petitioner", complete: true },
      { sectionKey: "relationship", complete: false },
    ],
  },
} satisfies QuestionnaireForCase;

describe("QuestionnaireWorkflow", () => {
  it("renders saved petitioner answers first in configured question order", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuestionnaireWorkflow, {
        caseId: "case-1",
        questionnaire: petitionerQuestionnaire,
        saveSectionAction: async () => ({
          ...successfulSave,
          questionnaireProgress: petitionerQuestionnaire.progress,
        }),
      }),
    );

    expect(html.indexOf("questionnaire-section-petitioner")).toBeLessThan(
      html.indexOf("questionnaire-section-relationship"),
    );
    expect(html.indexOf('name="petitioner_other_names"')).toBeLessThan(
      html.indexOf('name="petitioner_citizenship_basis"'),
    );
    expect(html).toContain("Taylor Previous");
    expect(html).toContain(
      '<option value="naturalization" selected="">Naturalization</option>',
    );
  });

  it("renders definition-driven question fields with stable names", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuestionnaireWorkflow, {
        caseId: "case-1",
        questionnaire,
        saveSectionAction: async () => successfulSave,
      }),
    );

    expect(html).toContain("Relationship");
    expect(html).toContain("0 of 1 sections complete");
    expect(html).toContain("Incomplete");
    expect(html).toContain("Have you met in person?");
    expect(html).toContain('name="met_in_person"');
    expect(html).toContain("Relationship history");
    expect(html).toContain('name="relationship_history"');
    expect(html).toContain("Describe how your relationship developed.");
    expect(html).toContain("We met in 2024.");
    expect(html).toContain('name="citizenship_basis"');
    expect(html).toContain("Naturalization");
    expect(html).not.toContain('name="meeting_waiver_explanation"');
    expect(html).toContain('id="questionnaire-section-relationship"');
    expect(html).toContain('href="/cases/case-1/review"');
    expect(html).toContain("Review answers");
  });

  it("renders conditional questions when dependency answers match", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuestionnaireWorkflow, {
        caseId: "case-1",
        questionnaire: {
          ...questionnaire,
          answers: [
            {
              caseId: "case-1",
              questionId: "question-met",
              questionKey: "met_in_person",
              value: false,
              updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            },
          ],
        },
        saveSectionAction: async () => successfulSave,
      }),
    );

    expect(html).toContain("Meeting waiver explanation");
    expect(html).toContain('name="meeting_waiver_explanation"');
  });

  it("hides conditional questions when dependency answers are missing", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuestionnaireWorkflow, {
        caseId: "case-1",
        questionnaire: {
          ...questionnaire,
          answers: [],
        },
        saveSectionAction: async () => successfulSave,
      }),
    );

    expect(html).not.toContain("Meeting waiver explanation");
    expect(html).not.toContain('name="meeting_waiver_explanation"');
  });

  it("renders field errors with accessible input associations", () => {
    const question = questionnaire.sections[0].questions[1];
    const html = renderToStaticMarkup(
      React.createElement(QuestionField, {
        question,
        value: "Invalid answer",
        error: "Enter a valid response.",
        onValueChange: () => undefined,
      }),
    );

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(
      'aria-describedby="question-relationship_history-help question-relationship_history-error"',
    );
    expect(html).toContain('id="question-relationship_history-error"');
    expect(html).toContain("Enter a valid response.");
  });
});
