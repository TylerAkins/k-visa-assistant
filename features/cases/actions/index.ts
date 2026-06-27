"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assertCaseOwnership,
  createCase,
  requireVerifiedUser,
} from "@/features/cases/server/cases";
import {
  saveBeneficiary,
  saveChildren,
  savePetitioner,
  updateCaseTitle,
} from "@/features/cases/server/forms";

export async function createCaseAction(formData: FormData) {
  const user = await requireVerifiedUser();
  const title = String(formData.get("title") ?? "").trim();
  const caseRecord = await createCase(user.id, title || "Untitled case");
  revalidatePath("/dashboard");
  redirect(`/cases/${caseRecord.id}`);
}

export async function updateCaseTitleAction(caseId: string, formData: FormData) {
  await assertCaseOwnership(caseId);
  const result = await updateCaseTitle(caseId, formData);
  revalidatePath("/dashboard");
  return result;
}

export async function savePetitionerAction(caseId: string, formData: FormData) {
  await assertCaseOwnership(caseId);
  const result = await savePetitioner(caseId, formData);
  revalidatePath("/dashboard");
  return result;
}

export async function saveBeneficiaryAction(caseId: string, formData: FormData) {
  await assertCaseOwnership(caseId);
  const result = await saveBeneficiary(caseId, formData);
  revalidatePath("/dashboard");
  return result;
}

export async function saveChildrenAction(caseId: string, formData: FormData) {
  await assertCaseOwnership(caseId);
  const result = await saveChildren(caseId, formData);
  revalidatePath("/dashboard");
  revalidatePath(`/cases/${caseId}`);
  return result;
}
