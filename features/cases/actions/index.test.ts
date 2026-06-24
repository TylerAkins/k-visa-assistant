import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertCaseOwnershipMock,
  createCaseMock,
  redirectMock,
  requireVerifiedUserMock,
  revalidatePathMock,
  saveBeneficiaryMock,
  saveChildrenMock,
  savePetitionerMock,
  updateCaseTitleMock,
} = vi.hoisted(() => ({
  assertCaseOwnershipMock: vi.fn(),
  createCaseMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  requireVerifiedUserMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  saveBeneficiaryMock: vi.fn(),
  saveChildrenMock: vi.fn(),
  savePetitionerMock: vi.fn(),
  updateCaseTitleMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/cases/server/cases", () => ({
  assertCaseOwnership: assertCaseOwnershipMock,
  createCase: createCaseMock,
  requireVerifiedUser: requireVerifiedUserMock,
}));

vi.mock("@/features/cases/server/forms", () => ({
  saveBeneficiary: saveBeneficiaryMock,
  saveChildren: saveChildrenMock,
  savePetitioner: savePetitionerMock,
  updateCaseTitle: updateCaseTitleMock,
}));

import {
  createCaseAction,
  saveBeneficiaryAction,
  saveChildrenAction,
  savePetitionerAction,
  updateCaseTitleAction,
} from "@/features/cases/actions";

function formDataFrom(entries: [string, string][]) {
  const formData = new FormData();

  for (const [key, value] of entries) {
    formData.append(key, value);
  }

  return formData;
}

describe("case server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertCaseOwnershipMock.mockResolvedValue({ id: "case-1", userId: "user-1" });
    createCaseMock.mockResolvedValue({ id: "case-1" });
    requireVerifiedUserMock.mockResolvedValue({ id: "user-1" });
    saveBeneficiaryMock.mockResolvedValue({ success: true, progressPercent: 20 });
    saveChildrenMock.mockResolvedValue({ success: true, progressPercent: 30 });
    savePetitionerMock.mockResolvedValue({ success: true, progressPercent: 10 });
    updateCaseTitleMock.mockResolvedValue({ success: true, progressPercent: 5 });
  });

  it("creates a case with a trimmed title and redirects to it", async () => {
    const formData = formDataFrom([["title", "  Tyler & Van  "]]);

    await expect(createCaseAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/cases/case-1",
    );
    expect(requireVerifiedUserMock).toHaveBeenCalled();
    expect(createCaseMock).toHaveBeenCalledWith("user-1", "Tyler & Van");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/cases/case-1");
  });

  it("defaults blank case titles before creating", async () => {
    const formData = formDataFrom([["title", "   "]]);

    await expect(createCaseAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/cases/case-1",
    );
    expect(createCaseMock).toHaveBeenCalledWith("user-1", "Untitled case");
  });

  it("checks ownership before updating a case title", async () => {
    const formData = formDataFrom([["title", "Updated"]]);

    await expect(updateCaseTitleAction("case-1", formData)).resolves.toEqual({
      success: true,
      progressPercent: 5,
    });
    expect(assertCaseOwnershipMock).toHaveBeenCalledWith("case-1");
    expect(updateCaseTitleMock).toHaveBeenCalledWith("case-1", formData);
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("checks ownership before saving petitioner data", async () => {
    const formData = new FormData();

    await expect(savePetitionerAction("case-1", formData)).resolves.toEqual({
      success: true,
      progressPercent: 10,
    });
    expect(assertCaseOwnershipMock).toHaveBeenCalledWith("case-1");
    expect(savePetitionerMock).toHaveBeenCalledWith("case-1", formData);
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("checks ownership before saving beneficiary data", async () => {
    const formData = new FormData();

    await expect(saveBeneficiaryAction("case-1", formData)).resolves.toEqual({
      success: true,
      progressPercent: 20,
    });
    expect(assertCaseOwnershipMock).toHaveBeenCalledWith("case-1");
    expect(saveBeneficiaryMock).toHaveBeenCalledWith("case-1", formData);
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("checks ownership before saving children data", async () => {
    const formData = new FormData();

    await expect(saveChildrenAction("case-1", formData)).resolves.toEqual({
      success: true,
      progressPercent: 30,
    });
    expect(assertCaseOwnershipMock).toHaveBeenCalledWith("case-1");
    expect(saveChildrenMock).toHaveBeenCalledWith("case-1", formData);
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });
});
