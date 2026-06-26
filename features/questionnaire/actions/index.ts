"use server";

import { revalidatePath } from "next/cache";

import { assertCaseOwnership } from "@/features/cases/server/cases";
import { saveQuestionnaireSectionAnswers } from "@/features/questionnaire/server/questionnaire";

export async function saveQuestionnaireSectionAction(
  caseId: string,
  sectionKey: string,
  formData: FormData,
) {
  await assertCaseOwnership(caseId);
  const result = await saveQuestionnaireSectionAnswers(
    caseId,
    sectionKey,
    formData,
  );
  revalidatePath(`/cases/${caseId}`);
  return result;
}
