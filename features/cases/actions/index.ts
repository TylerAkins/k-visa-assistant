"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertCaseOwnership, createCase } from "@/features/cases/server/cases";
import {
  addChild,
  saveBeneficiary,
  savePetitioner,
  updateCaseTitle,
} from "@/features/cases/server/forms";
import { getCurrentUser } from "@/features/auth/server/session";

export async function createCaseAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const title = String(formData.get("title") ?? "").trim();
  const caseRecord = await createCase(user.id, title || "Untitled case");
  revalidatePath("/dashboard");
  redirect(`/cases/${caseRecord.id}`);
}

export async function updateCaseTitleAction(caseId: string, formData: FormData) {
  await assertCaseOwnership(caseId);
  const result = await updateCaseTitle(caseId, formData);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
  return result;
}

export async function savePetitionerAction(caseId: string, formData: FormData) {
  await assertCaseOwnership(caseId);
  const result = await savePetitioner(caseId, formData);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
  return result;
}

export async function saveBeneficiaryAction(caseId: string, formData: FormData) {
  await assertCaseOwnership(caseId);
  const result = await saveBeneficiary(caseId, formData);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
  return result;
}

export async function addChildAction(caseId: string, formData: FormData) {
  await assertCaseOwnership(caseId);
  const result = await addChild(caseId, formData);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
  return result;
}
