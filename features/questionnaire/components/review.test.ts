import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuestionnaireReviewScreen } from "@/features/questionnaire/components/review";
import type { QuestionnaireReview } from "@/features/questionnaire/types";

const review = {
  sections: [
    {
      key: "petitioner",
      title: "Petitioner",
      description: "Petitioner details.",
      complete: true,
      questions: [
        {
          key: "citizenship_basis",
          label: "Citizenship basis",
          displayValue: "Naturalization",
          status: "answered",
          error: null,
        },
        {
          key: "other_names",
          label: "Other names",
          displayValue: "Not provided",
          status: "not_provided",
          error: null,
        },
      ],
    },
    {
      key: "relationship",
      title: "Relationship",
      description: null,
      complete: false,
      questions: [
        {
          key: "met_in_person",
          label: "Met in person",
          displayValue: "Not provided",
          status: "missing",
          error: 'Please answer "Met in person" before saving.',
        },
      ],
    },
  ],
} satisfies QuestionnaireReview;

describe("QuestionnaireReviewScreen", () => {
  it("renders grouped answers, statuses, warnings, and edit links", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuestionnaireReviewScreen, {
        caseId: "case-1",
        review,
      }),
    );

    expect(html).toContain("Review questionnaire answers");
    expect(html).toContain("Petitioner details.");
    expect(html).toContain("Naturalization");
    expect(html).toContain("Complete");
    expect(html).toContain("Needs attention");
    expect(html).toContain('role="alert"');
    expect(html).toContain(
      'Please answer &quot;Met in person&quot; before saving.',
    );
    expect(html).toContain(
      'href="/cases/case-1#questionnaire-section-petitioner"',
    );
    expect(html).toContain(
      'href="/cases/case-1#questionnaire-section-relationship"',
    );
  });
});
