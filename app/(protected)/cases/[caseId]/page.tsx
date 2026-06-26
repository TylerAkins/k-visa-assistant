import { notFound } from "next/navigation";

import {
  saveBeneficiaryAction,
  saveChildrenAction,
  savePetitionerAction,
  updateCaseTitleAction,
} from "@/features/cases/actions";
import { CaseEditor } from "@/features/cases/components/forms";
import {
  CaseAccessError,
  getCaseOverview,
} from "@/features/cases/server/cases";
import { saveQuestionnaireSectionAction } from "@/features/questionnaire/actions";
import { getQuestionnaireForCase } from "@/features/questionnaire/server/questionnaire";

export default async function CaseOverviewPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  let questionnaire;

  try {
    questionnaire = await getQuestionnaireForCase(caseId);
  } catch (error) {
    if (error instanceof CaseAccessError) {
      notFound();
    }

    throw error;
  }

  const overview = await getCaseOverview(
    caseId,
    questionnaire.progress.percent / 100,
  );

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
