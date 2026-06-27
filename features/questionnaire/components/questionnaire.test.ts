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

const relationshipQuestionnaire = {
  ...questionnaire,
  sections: [
    {
      ...questionnaire.sections[0],
      questions: [
        {
          id: "question-familial",
          key: "familial_relationship",
          label: "Are you and your fiance related to each other?",
          helpText: "Include relationships by blood, marriage, or adoption.",
          questionType: "boolean",
          required: true,
          sortOrder: 10,
          config: null,
        },
        {
          id: "question-familial-details",
          key: "familial_relationship_details",
          label: "Nature and degree of relationship",
          helpText: "Describe how you and your fiance are related.",
          questionType: "textarea",
          required: true,
          sortOrder: 20,
          config: {
            visibleWhen: { questionKey: "familial_relationship", equals: true },
          },
        },
        {
          ...questionnaire.sections[0].questions[0],
          sortOrder: 30,
        },
        {
          id: "question-meeting-date",
          key: "most_recent_meeting_date",
          label: "Most recent in-person meeting date",
          helpText: null,
          questionType: "date",
          required: true,
          sortOrder: 40,
          config: { visibleWhen: { questionKey: "met_in_person", equals: true } },
        },
        {
          id: "question-meeting-details",
          key: "in_person_meeting_details",
          label: "In-person meeting details",
          helpText: "Describe the circumstances and location of your most recent meeting.",
          questionType: "textarea",
          required: true,
          sortOrder: 50,
          config: { visibleWhen: { questionKey: "met_in_person", equals: true } },
        },
        {
          ...questionnaire.sections[0].questions[2],
          sortOrder: 60,
        },
        {
          ...questionnaire.sections[0].questions[1],
          required: true,
          sortOrder: 70,
        },
      ],
    },
  ],
  answers: [
    {
      caseId: "case-1",
      questionId: "question-familial",
      questionKey: "familial_relationship",
      value: false,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    ...questionnaire.answers,
    {
      caseId: "case-1",
      questionId: "question-meeting-date",
      questionKey: "most_recent_meeting_date",
      value: "2026-01-15",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      caseId: "case-1",
      questionId: "question-meeting-details",
      questionKey: "in_person_meeting_details",
      value: "We met in Chicago.",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
} satisfies QuestionnaireForCase;

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

const beneficiaryQuestionnaire = {
  ...questionnaire,
  sections: [
    ...petitionerQuestionnaire.sections.slice(0, 1),
    {
      id: "section-beneficiary",
      key: "beneficiary",
      title: "Beneficiary",
      description: "Foreign fiance beneficiary information for the case.",
      sortOrder: 20,
      questions: [
        {
          id: "question-beneficiary-currently-in-us",
          key: "beneficiary_currently_in_us",
          label: "Is the beneficiary currently in the United States?",
          helpText: null,
          questionType: "boolean",
          required: true,
          sortOrder: 10,
          config: null,
        },
        {
          id: "question-beneficiary-passport-number",
          key: "beneficiary_passport_number",
          label: "Passport number",
          helpText: null,
          questionType: "text",
          required: true,
          sortOrder: 20,
          config: {
            visibleWhen: {
              questionKey: "beneficiary_currently_in_us",
              equals: true,
            },
          },
        },
        {
          id: "question-beneficiary-passport-expiration",
          key: "beneficiary_passport_expiration",
          label: "Passport expiration date",
          helpText: null,
          questionType: "date",
          required: true,
          sortOrder: 30,
          config: {
            visibleWhen: {
              questionKey: "beneficiary_currently_in_us",
              equals: true,
            },
          },
        },
      ],
    },
    ...questionnaire.sections,
  ],
  answers: [
    {
      caseId: "case-1",
      questionId: "question-beneficiary-currently-in-us",
      questionKey: "beneficiary_currently_in_us",
      value: true,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      caseId: "case-1",
      questionId: "question-beneficiary-passport-number",
      questionKey: "beneficiary_passport_number",
      value: "X1234567",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      caseId: "case-1",
      questionId: "question-beneficiary-passport-expiration",
      questionKey: "beneficiary_passport_expiration",
      value: "2030-06-15",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
  progress: {
    completedSections: 1,
    totalSections: 3,
    percent: 33,
    sections: [
      { sectionKey: "petitioner", complete: false },
      { sectionKey: "beneficiary", complete: true },
      { sectionKey: "relationship", complete: false },
    ],
  },
} satisfies QuestionnaireForCase;

describe("QuestionnaireWorkflow", () => {
  it("renders saved relationship answers in configured question order", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuestionnaireWorkflow, {
        caseId: "case-1",
        questionnaire: relationshipQuestionnaire,
        saveSectionAction: async () => successfulSave,
      }),
    );
    const fieldNames = [
      "familial_relationship",
      "met_in_person",
      "most_recent_meeting_date",
      "in_person_meeting_details",
      "relationship_history",
    ];

    for (const [index, fieldName] of fieldNames.entries()) {
      expect(html).toContain(`name="${fieldName}"`);
      if (index > 0) {
        expect(html.indexOf(`name="${fieldNames[index - 1]}"`)).toBeLessThan(
          html.indexOf(`name="${fieldName}"`),
        );
      }
    }
    expect(html).not.toContain('name="familial_relationship_details"');
    expect(html).not.toContain('name="meeting_waiver_explanation"');
    expect(html).toContain('value="2026-01-15"');
    expect(html).toContain("We met in Chicago.");
  });

  it("renders only the matching familial and meeting branches", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuestionnaireWorkflow, {
        caseId: "case-1",
        questionnaire: {
          ...relationshipQuestionnaire,
          answers: [
            {
              caseId: "case-1",
              questionId: "question-familial",
              questionKey: "familial_relationship",
              value: true,
              updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            },
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

    expect(html).toContain('name="familial_relationship_details"');
    expect(html).toContain('name="meeting_waiver_explanation"');
    expect(html).not.toContain('name="most_recent_meeting_date"');
    expect(html).not.toContain('name="in_person_meeting_details"');
  });
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

  it("renders saved beneficiary answers between petitioner and relationship", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuestionnaireWorkflow, {
        caseId: "case-1",
        questionnaire: beneficiaryQuestionnaire,
        saveSectionAction: async () => ({
          ...successfulSave,
          questionnaireProgress: beneficiaryQuestionnaire.progress,
        }),
      }),
    );

    expect(html.indexOf("questionnaire-section-petitioner")).toBeLessThan(
      html.indexOf("questionnaire-section-beneficiary"),
    );
    expect(html.indexOf("questionnaire-section-beneficiary")).toBeLessThan(
      html.indexOf("questionnaire-section-relationship"),
    );
    expect(html.indexOf('name="beneficiary_currently_in_us"')).toBeLessThan(
      html.indexOf('name="beneficiary_passport_number"'),
    );
    expect(html.indexOf('name="beneficiary_passport_number"')).toBeLessThan(
      html.indexOf('name="beneficiary_passport_expiration"'),
    );
    expect(html).toContain('<option value="true" selected="">Yes</option>');
    expect(html).toContain('value="X1234567"');
    expect(html).toContain('value="2030-06-15"');
  });

  it("hides beneficiary passport questions when the beneficiary is not in the US", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuestionnaireWorkflow, {
        caseId: "case-1",
        questionnaire: {
          ...beneficiaryQuestionnaire,
          answers: [
            {
              caseId: "case-1",
              questionId: "question-beneficiary-currently-in-us",
              questionKey: "beneficiary_currently_in_us",
              value: false,
              updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            },
          ],
        },
        saveSectionAction: async () => successfulSave,
      }),
    );

    expect(html).toContain('name="beneficiary_currently_in_us"');
    expect(html).not.toContain('name="beneficiary_passport_number"');
    expect(html).not.toContain('name="beneficiary_passport_expiration"');
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
