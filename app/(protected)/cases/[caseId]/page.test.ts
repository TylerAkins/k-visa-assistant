import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCaseOverviewMock, getQuestionnaireForCaseMock, notFoundMock } =
  vi.hoisted(() => ({
    getCaseOverviewMock: vi.fn(),
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

  return {
    CaseAccessError,
    getCaseOverview: getCaseOverviewMock,
  };
});

vi.mock("@/features/questionnaire/server/questionnaire", () => ({
  getQuestionnaireForCase: getQuestionnaireForCaseMock,
}));

vi.mock("@/features/cases/components/forms", () => ({
  CaseEditor: vi.fn(),
}));

vi.mock("@/features/cases/actions", () => ({
  saveBeneficiaryAction: vi.fn(),
  saveChildrenAction: vi.fn(),
  savePetitionerAction: vi.fn(),
  updateCaseTitleAction: vi.fn(),
}));

vi.mock("@/features/questionnaire/actions", () => ({
  saveQuestionnaireSectionAction: vi.fn(),
}));

import CaseOverviewPage from "@/app/(protected)/cases/[caseId]/page";
import { CaseAccessError } from "@/features/cases/server/cases";

describe("CaseOverviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders not found for inaccessible cases", async () => {
    getQuestionnaireForCaseMock.mockRejectedValueOnce(new CaseAccessError());

    await expect(
      CaseOverviewPage({ params: Promise.resolve({ caseId: "case-1" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
    expect(getCaseOverviewMock).not.toHaveBeenCalled();
  });

  it("preserves operational questionnaire errors", async () => {
    const error = new Error("Invalid questionnaire definition.");
    getQuestionnaireForCaseMock.mockRejectedValueOnce(error);

    await expect(
      CaseOverviewPage({ params: Promise.resolve({ caseId: "case-1" }) }),
    ).rejects.toBe(error);

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(getCaseOverviewMock).not.toHaveBeenCalled();
  });
});
