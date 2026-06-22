import { notFound } from "next/navigation";

import {
  saveBeneficiaryAction,
  saveChildrenAction,
  savePetitionerAction,
  updateCaseTitleAction,
} from "@/features/cases/actions";
import { CaseEditor } from "@/features/cases/components/forms";
import { getCaseOverview } from "@/features/cases/server/cases";

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

  return (
    <CaseEditor
      overview={overview}
      updateCaseTitleAction={updateCaseTitleAction}
      savePetitionerAction={savePetitionerAction}
      saveBeneficiaryAction={saveBeneficiaryAction}
      saveChildrenAction={saveChildrenAction}
    />
  );
}
