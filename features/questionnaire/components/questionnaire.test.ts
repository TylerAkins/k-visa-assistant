import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuestionnaireWorkflow } from "@/features/questionnaire/components/questionnaire";
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
} satisfies QuestionnaireForCase;

describe("QuestionnaireWorkflow", () => {
  it("renders definition-driven question fields with stable names", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuestionnaireWorkflow, {
        caseId: "case-1",
        questionnaire,
        saveSectionAction: async () => ({ success: true }),
      }),
    );

    expect(html).toContain("Relationship");
    expect(html).toContain("Have you met in person?");
    expect(html).toContain('name="met_in_person"');
    expect(html).toContain("Relationship history");
    expect(html).toContain('name="relationship_history"');
    expect(html).toContain("Describe how your relationship developed.");
    expect(html).toContain("We met in 2024.");
    expect(html).toContain('name="citizenship_basis"');
    expect(html).toContain("Naturalization");
  });
});
