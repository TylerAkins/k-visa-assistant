import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CaseTitleForm,
  ChildForm,
  FutureFeaturePlaceholders,
  PersonForm,
} from "@/features/cases/components/forms";
import {
  addChildAction,
  saveBeneficiaryAction,
  savePetitionerAction,
  updateCaseTitleAction,
} from "@/features/cases/actions";
import { getCaseOverview } from "@/features/cases/server/cases";

export default async function CaseOverviewPage({
  params,
}: {
  params: { caseId: string };
}) {
  const { caseId } = params;
  const overview = await getCaseOverview(caseId).catch(() => null);

  if (!overview) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <Card className="bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-2xl">{overview.case.title}</CardTitle>
            <Badge variant="secondary">{overview.case.status}</Badge>
            <Badge>{overview.case.progressPercent}% complete</Badge>
          </div>
          <CaseTitleForm
            caseId={overview.case.id}
            title={overview.case.title}
            action={updateCaseTitleAction}
          />
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <PersonForm
          caseId={overview.case.id}
          title="Petitioner"
          description="Enter the U.S. citizen or lawful permanent resident petitioner details."
          action={savePetitionerAction}
        />
        <PersonForm
          caseId={overview.case.id}
          title="Beneficiary"
          description="Enter the fiance(e) details for the K-1 case."
          action={saveBeneficiaryAction}
        />
      </div>

      <ChildForm caseId={overview.case.id} action={addChildAction} />
      <FutureFeaturePlaceholders />
    </div>
  );
}
