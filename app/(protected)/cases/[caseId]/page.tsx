import { notFound } from "next/navigation";

import {
  saveBeneficiaryAction,
  saveChildrenAction,
  savePetitionerAction,
  updateCaseTitleAction,
} from "@/features/cases/actions";
import { CaseEditor } from "@/features/cases/components/forms";
import { getCaseOverview } from "@/features/cases/server/cases";
import { saveQuestionnaireSectionAction } from "@/features/questionnaire/actions";
import { getQuestionnaireForCase } from "@/features/questionnaire/server/questionnaire";

export default async function CaseOverviewPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const overview = await getCaseOverview(caseId).catch(() => null);

  if (!overview) {
    notFound();
  }

  const questionnaire = await getQuestionnaireForCase(caseId);

  return (
    <CaseEditor
      overview={overview}
      questionnaire={questionnaire}
      updateCaseTitleAction={updateCaseTitleAction}
      savePetitionerAction={savePetitionerAction}
      saveBeneficiaryAction={saveBeneficiaryAction}
      saveChildrenAction={saveChildrenAction}
      saveQuestionnaireSectionAction={saveQuestionnaireSectionAction}
    />
  );
}
