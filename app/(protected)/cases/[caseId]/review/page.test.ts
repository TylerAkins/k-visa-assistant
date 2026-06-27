import { beforeEach, describe, expect, it, vi } from "vitest";

const { getQuestionnaireForCaseMock, notFoundMock } = vi.hoisted(() => ({
  getQuestionnaireForCaseMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/features/cases/server/cases", () => {
  class CaseAccessError extends Error {}

  return { CaseAccessError };
});

vi.mock("@/features/questionnaire/server/questionnaire", () => ({
  getQuestionnaireForCase: getQuestionnaireForCaseMock,
}));

import QuestionnaireReviewPage from "@/app/(protected)/cases/[caseId]/review/page";
import { CaseAccessError } from "@/features/cases/server/cases";

const questionnaire = {
  sections: [],
  answers: [],
  state: null,
  progress: {
    completedSections: 0,
    totalSections: 0,
    percent: 0,
    sections: [],
  },
};

describe("QuestionnaireReviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a review for an owned case", async () => {
    getQuestionnaireForCaseMock.mockResolvedValueOnce(questionnaire);

    const page = await QuestionnaireReviewPage({
      params: Promise.resolve({ caseId: "case-1" }),
    });

    expect(getQuestionnaireForCaseMock).toHaveBeenCalledWith("case-1");
    expect(page.props).toMatchObject({
      caseId: "case-1",
      review: { sections: [] },
    });
  });

  it("renders not found for inaccessible cases", async () => {
    getQuestionnaireForCaseMock.mockRejectedValueOnce(new CaseAccessError());

    await expect(
      QuestionnaireReviewPage({
        params: Promise.resolve({ caseId: "case-2" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("preserves operational questionnaire errors", async () => {
    const error = new Error("Invalid questionnaire definition.");
    getQuestionnaireForCaseMock.mockRejectedValueOnce(error);

    await expect(
      QuestionnaireReviewPage({
        params: Promise.resolve({ caseId: "case-1" }),
      }),
    ).rejects.toBe(error);

    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
