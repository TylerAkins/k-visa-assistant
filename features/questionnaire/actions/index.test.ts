import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertCaseOwnershipMock,
  revalidatePathMock,
  saveQuestionnaireSectionAnswersMock,
} = vi.hoisted(() => ({
  assertCaseOwnershipMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  saveQuestionnaireSectionAnswersMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/features/cases/server/cases", () => ({
  assertCaseOwnership: assertCaseOwnershipMock,
}));

vi.mock("@/features/questionnaire/server/questionnaire", () => ({
  saveQuestionnaireSectionAnswers: saveQuestionnaireSectionAnswersMock,
}));

import { saveQuestionnaireSectionAction } from "@/features/questionnaire/actions";

describe("questionnaire server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertCaseOwnershipMock.mockResolvedValue({ id: "case-1", userId: "user-1" });
    saveQuestionnaireSectionAnswersMock.mockResolvedValue({ success: true });
  });

  it("checks ownership before saving section answers", async () => {
    const formData = new FormData();

    await expect(
      saveQuestionnaireSectionAction("case-1", "relationship", formData),
    ).resolves.toEqual({ success: true });

    expect(assertCaseOwnershipMock).toHaveBeenCalledWith("case-1");
    expect(saveQuestionnaireSectionAnswersMock).toHaveBeenCalledWith(
      "case-1",
      "relationship",
      formData,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/cases/case-1");
  });

  it("does not revalidate when section validation fails", async () => {
    const result = {
      success: false as const,
      fieldErrors: { met_in_person: ["Choose yes or no."] },
    };
    saveQuestionnaireSectionAnswersMock.mockResolvedValueOnce(result);

    await expect(
      saveQuestionnaireSectionAction(
        "case-1",
        "relationship",
        new FormData(),
      ),
    ).resolves.toEqual(result);

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects unowned cases before saving or revalidating", async () => {
    assertCaseOwnershipMock.mockRejectedValueOnce(new Error("Unauthorized"));

    await expect(
      saveQuestionnaireSectionAction(
        "case-2",
        "relationship",
        new FormData(),
      ),
    ).rejects.toThrow("Unauthorized");

    expect(saveQuestionnaireSectionAnswersMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
